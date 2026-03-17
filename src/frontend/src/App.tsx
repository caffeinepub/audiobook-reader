import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { BookMetadata } from "./backend.d";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import LibraryPage from "./components/LibraryPage";
import ReaderView from "./components/ReaderView";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

const queryClient = new QueryClient();

type Page = "library" | "reader" | "upload";

function AppContent() {
  const { login, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const [page, setPage] = useState<Page>("library");
  const [activeBook, setActiveBook] = useState<BookMetadata | null>(null);
  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);

  const isLoggedIn = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.118 0.018 42)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "oklch(0.73 0.1 70)",
              borderTopColor: "transparent",
            }}
          />
          <span className="text-sm" style={{ color: "oklch(0.55 0.025 55)" }}>
            Loading AudibleNook...
          </span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LandingPage onLogin={login} isLoggingIn={isLoggingIn} />;
  }

  const handleOpenReader = (book: BookMetadata, file?: File) => {
    setActiveBook(book);
    setActiveFile(file);
    setPage("reader");
  };

  const handleNavigate = (p: Page) => {
    if (p === "upload") {
      // Trigger file picker by navigating to library with upload trigger
      setPage("library");
      return;
    }
    setPage(p);
    if (p !== "reader") {
      setActiveBook(null);
      setActiveFile(undefined);
    }
  };

  return (
    <div className="min-h-screen">
      <Header currentPage={page} onNavigate={handleNavigate} />

      {page === "reader" && activeBook ? (
        <ReaderView
          book={activeBook}
          file={activeFile}
          onBack={() => setPage("library")}
        />
      ) : (
        <LibraryPage
          onOpenReader={handleOpenReader}
          onUploadPage={() => setPage("upload")}
        />
      )}

      <footer
        className="max-w-[1200px] mx-auto px-6 py-6 border-t"
        style={{ borderColor: "oklch(0.22 0.025 42)" }}
      >
        <p
          className="text-xs text-center"
          style={{ color: "oklch(0.38 0.02 50)" }}
        >
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.55 0.08 65)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
