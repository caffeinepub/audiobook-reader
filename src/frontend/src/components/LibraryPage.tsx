import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Trash2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { BookMetadata } from "../backend.d";
import { FileType } from "../backend.d";
import useBlobStorage from "../hooks/useBlobStorage";
import { useAddBook, useDeleteBook, useUserLibrary } from "../hooks/useQueries";
import { extractBook } from "../lib/textExtraction";

const SAMPLE_BOOKS: BookMetadata[] = [
  {
    id: "sample-1",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    filePath: "",
    fileSize: BigInt(245000),
    fileType: FileType.epub,
    uploadTime: BigInt(Date.now() * 1_000_000),
  },
  {
    id: "sample-2",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    filePath: "",
    fileSize: BigInt(512000),
    fileType: FileType.epub,
    uploadTime: BigInt((Date.now() - 86400000) * 1_000_000),
  },
  {
    id: "sample-3",
    title: "Meditations",
    author: "Marcus Aurelius",
    filePath: "",
    fileSize: BigInt(180000),
    fileType: FileType.pdf,
    uploadTime: BigInt((Date.now() - 172800000) * 1_000_000),
  },
  {
    id: "sample-4",
    title: "The Old Man and the Sea",
    author: "Ernest Hemingway",
    filePath: "",
    fileSize: BigInt(95000),
    fileType: FileType.txt,
    uploadTime: BigInt((Date.now() - 259200000) * 1_000_000),
  },
];

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d"];

function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fileTypeColor(ft: FileType): string {
  if (ft === FileType.epub) return "oklch(0.55 0.12 270)";
  if (ft === FileType.pdf) return "oklch(0.55 0.18 27)";
  return "oklch(0.55 0.1 150)";
}

function getProgressValue(bookId: string): number {
  const map: Record<string, number> = {
    "sample-1": 68,
    "sample-2": 32,
    "sample-3": 91,
    "sample-4": 15,
  };
  return map[bookId] ?? 0;
}

interface LibraryPageProps {
  onOpenReader: (book: BookMetadata, file?: File) => void;
  onUploadPage: () => void;
}

export default function LibraryPage({
  onOpenReader,
  onUploadPage,
}: LibraryPageProps) {
  const { data: books, isLoading } = useUserLibrary();
  const { mutate: deleteBook } = useDeleteBook();
  const { mutate: addBook } = useAddBook();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useBlobStorage();
  // Keep uploaded files in memory so the reader can access them
  const fileMapRef = useRef<Map<string, File>>(new Map());

  const displayBooks = books && books.length > 0 ? books : SAMPLE_BOOKS;

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const extracted = await extractBook(file);
        const filePath = await uploadFile(file);
        const ext = file.name.split(".").pop()?.toLowerCase();
        const fileType =
          ext === "pdf"
            ? FileType.pdf
            : ext === "epub"
              ? FileType.epub
              : FileType.txt;
        const bookId = crypto.randomUUID();
        const book: BookMetadata = {
          id: bookId,
          title: extracted.title,
          author: extracted.author,
          filePath: filePath || file.name,
          fileSize: BigInt(file.size),
          fileType,
          uploadTime: BigInt(Date.now() * 1_000_000),
        };
        // Store the file so the reader can use it directly
        fileMapRef.current.set(bookId, file);
        addBook(book);
        toast.success(`"${book.title}" added to your library!`);
        // Open reader immediately with the file so content loads correctly
        onOpenReader(book, file);
      } catch (e) {
        toast.error("Failed to process file. Please try again.");
        console.error(e);
      } finally {
        setUploading(false);
      }
    },
    [addBook, uploadFile, onOpenReader],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleOpenBook = useCallback(
    (book: BookMetadata) => {
      const file = fileMapRef.current.get(book.id);
      onOpenReader(book, file);
    },
    [onOpenReader],
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-10 pb-32">
      {/* Section header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2
            className="font-serif text-3xl font-bold"
            style={{ color: "oklch(0.73 0.1 70)" }}
          >
            My Library
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.62 0.03 55)" }}>
            {displayBooks.length} books in your collection
          </p>
        </div>
        <Button
          onClick={onUploadPage}
          className="gold-btn flex items-center gap-2 px-5 rounded-full"
          data-ocid="library.upload.button"
        >
          <Upload className="w-4 h-4" />
          Add Book
        </Button>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="mb-8 rounded-2xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer block"
        style={{
          borderColor: dragging ? "oklch(0.73 0.1 70)" : "oklch(0.28 0.025 45)",
          background: dragging ? "oklch(0.73 0.1 70 / 0.05)" : "transparent",
        }}
        data-ocid="library.dropzone"
      >
        <input
          type="file"
          accept=".pdf,.epub,.txt"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            // Reset input so same file can be re-uploaded
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div
            className="flex flex-col items-center gap-2"
            data-ocid="library.loading_state"
          >
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "oklch(0.73 0.1 70)",
                borderTopColor: "transparent",
              }}
            />
            <p className="text-sm" style={{ color: "oklch(0.62 0.03 55)" }}>
              Processing book...
            </p>
          </div>
        ) : (
          <>
            <Upload
              className="w-8 h-8 mx-auto mb-2"
              style={{
                color: dragging ? "oklch(0.73 0.1 70)" : "oklch(0.45 0.03 50)",
              }}
            />
            <p className="text-sm" style={{ color: "oklch(0.62 0.03 55)" }}>
              Drop a PDF, EPUB, or TXT file here, or{" "}
              <span style={{ color: "oklch(0.73 0.1 70)" }}>
                click to browse
              </span>
            </p>
          </>
        )}
      </label>

      {/* Book grid */}
      {isLoading ? (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-5"
          data-ocid="library.loading_state"
        >
          {SKELETON_KEYS.map((k) => (
            <div
              key={k}
              className="rounded-2xl h-64 animate-pulse"
              style={{ background: "oklch(0.148 0.022 40)" }}
            />
          ))}
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="text-center py-20" data-ocid="library.empty_state">
          <BookOpen
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.35 0.03 50)" }}
          />
          <p style={{ color: "oklch(0.55 0.03 55)" }}>
            Your library is empty. Upload a book to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayBooks.map((book, idx) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="card-hover rounded-2xl overflow-hidden cursor-pointer group"
              style={{
                background: "oklch(0.148 0.022 40)",
                border: "1px solid oklch(0.24 0.025 45 / 0.6)",
              }}
              onClick={() => handleOpenBook(book)}
              data-ocid={`library.item.${idx + 1}`}
            >
              {/* Cover art */}
              <div
                className="h-40 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, oklch(0.17 0.03 ${40 + idx * 15}) 0%, oklch(0.22 0.04 ${50 + idx * 12}) 100%)`,
                }}
              >
                <BookOpen
                  className="w-12 h-12 opacity-30"
                  style={{ color: "oklch(0.73 0.1 70)" }}
                />
              </div>

              {/* Meta */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3
                    className="font-semibold text-sm leading-tight line-clamp-2"
                    style={{ color: "oklch(0.88 0.02 65)" }}
                  >
                    {book.title}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBook(book.id);
                    }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
                    data-ocid={`library.delete_button.${idx + 1}`}
                  >
                    <Trash2
                      className="w-3.5 h-3.5"
                      style={{ color: "oklch(0.65 0.15 27)" }}
                    />
                  </button>
                </div>
                <p
                  className="text-xs mb-2"
                  style={{ color: "oklch(0.55 0.025 55)" }}
                >
                  {book.author}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: `${fileTypeColor(book.fileType)}22`,
                      color: fileTypeColor(book.fileType),
                    }}
                  >
                    {book.fileType.toUpperCase()}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.45 0.02 50)" }}
                  >
                    {formatFileSize(book.fileSize)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.025 55)" }}
                    >
                      Progress
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.73 0.1 70)" }}
                    >
                      {getProgressValue(book.id)}%
                    </span>
                  </div>
                  <Progress
                    value={getProgressValue(book.id)}
                    className="h-1"
                    style={{ background: "oklch(0.22 0.02 40)" }}
                  />
                </div>

                <div className="flex items-center gap-1 mt-2">
                  <Clock
                    className="w-3 h-3"
                    style={{ color: "oklch(0.45 0.02 50)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.45 0.02 50)" }}
                  >
                    {formatDate(book.uploadTime)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
