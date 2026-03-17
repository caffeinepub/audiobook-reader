import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookMetadata, ReadingProgress } from "../backend.d";
import { useActor } from "./useActor";

export function useUserLibrary() {
  const { actor, isFetching } = useActor();
  return useQuery<BookMetadata[]>({
    queryKey: ["userLibrary"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserLibrary();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddBook() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: BookMetadata) => {
      if (!actor) throw new Error("Not connected");
      await actor.addBook(book);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userLibrary"] }),
  });
}

export function useDeleteBook() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.deleteBook(bookId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userLibrary"] }),
  });
}

export function useReadingProgress(bookId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ReadingProgress | null>({
    queryKey: ["readingProgress", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return null;
      return actor.getReadingProgress(bookId);
    },
    enabled: !!actor && !isFetching && !!bookId,
  });
}

export function useSaveReadingProgress() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (progress: ReadingProgress) => {
      if (!actor) throw new Error("Not connected");
      await actor.saveReadingProgress(progress);
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["readingProgress", vars.bookId] }),
  });
}
