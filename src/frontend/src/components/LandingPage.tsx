import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function LandingPage({
  onLogin,
  isLoggingIn,
}: LandingPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.10 0.018 42) 0%, oklch(0.08 0.022 38) 100%)",
      }}
    >
      {/* Hero */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/generated/hero-library.dim_1400x600.jpg')",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.08 0.018 40 / 0.7) 0%, oklch(0.08 0.018 40 / 0.85) 50%, oklch(0.08 0.018 40 / 0.98) 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center px-6 max-w-2xl mx-auto py-24"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <BookOpen
              className="w-8 h-8"
              style={{ color: "oklch(0.73 0.1 70)" }}
            />
            <span
              className="font-serif text-2xl font-bold"
              style={{ color: "oklch(0.73 0.1 70)" }}
            >
              AudibleNook
            </span>
          </div>
          <h1
            className="font-serif text-5xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ color: "oklch(0.93 0.025 65)" }}
          >
            Your Books,{" "}
            <span style={{ color: "oklch(0.73 0.1 70)" }}>
              Beautifully Narrated
            </span>
          </h1>
          <p className="text-lg mb-8" style={{ color: "oklch(0.72 0.025 60)" }}>
            Upload any ebook — PDF, EPUB, or TXT — and experience it as a
            premium audiobook with emotion-aware narration, perfect pacing, and
            cinematic atmosphere.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gold-btn px-8 py-3 text-base rounded-full"
              data-ocid="landing.login.button"
            >
              {isLoggingIn ? "Connecting..." : "Start Listening"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            {[
              {
                icon: Headphones,
                title: "Real Audiobook Feel",
                desc: "Premium voices with natural pacing",
              },
              {
                icon: Sparkles,
                title: "Emotion-Aware",
                desc: "Detects mood for expressive narration",
              },
              {
                icon: BookOpen,
                title: "Any Format",
                desc: "PDF, EPUB, and plain text supported",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl p-4 text-center"
                style={{
                  background: "oklch(0.14 0.02 40 / 0.8)",
                  border: "1px solid oklch(0.24 0.025 45 / 0.5)",
                }}
              >
                <Icon
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: "oklch(0.73 0.1 70)" }}
                />
                <div
                  className="font-semibold text-sm"
                  style={{ color: "oklch(0.88 0.02 65)" }}
                >
                  {title}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.62 0.03 55)" }}
                >
                  {desc}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer
        className="text-center py-4 text-xs"
        style={{ color: "oklch(0.45 0.02 50)" }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "oklch(0.62 0.08 65)" }}
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
