import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, BookOpen, ChevronDown } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface HeaderProps {
  currentPage: "library" | "reader" | "upload";
  onNavigate: (page: "library" | "reader" | "upload") => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { identity, clear } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";
  const shortId = principal ? `${principal.slice(0, 5)}...` : "Guest";

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "oklch(0.10 0.018 40 / 0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid oklch(0.24 0.025 45 / 0.5)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onNavigate("library")}
          className="flex items-center gap-2 flex-shrink-0"
          data-ocid="nav.link"
        >
          <BookOpen
            className="w-5 h-5"
            style={{ color: "oklch(0.73 0.1 70)" }}
          />
          <span
            className="font-serif text-lg font-bold"
            style={{ color: "oklch(0.73 0.1 70)" }}
          >
            AudibleNook
          </span>
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-5 flex-1">
          {(["library", "upload"] as const).map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => onNavigate(page)}
              className="text-sm capitalize transition-colors"
              style={{
                color:
                  currentPage === page
                    ? "oklch(0.73 0.1 70)"
                    : "oklch(0.75 0.02 60)",
                fontWeight: currentPage === page ? 600 : 400,
              }}
              data-ocid={`nav.${page}.link`}
            >
              {page === "library" ? "My Library" : "Upload Book"}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            className="p-2 rounded-full opacity-60 hover:opacity-100 transition-opacity"
            data-ocid="nav.bell.button"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
            onClick={clear}
            onKeyDown={(e) => e.key === "Enter" && clear()}
            data-ocid="nav.user.button"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback
                style={{
                  background: "oklch(0.25 0.03 45)",
                  color: "oklch(0.73 0.1 70)",
                  fontSize: "10px",
                }}
              >
                {shortId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className="text-xs hidden sm:block"
              style={{ color: "oklch(0.75 0.02 60)" }}
            >
              {shortId}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        </div>
      </div>
    </header>
  );
}
