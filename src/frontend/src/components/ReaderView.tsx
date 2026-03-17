import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { BookMetadata } from "../backend.d";
import { useSaveReadingProgress } from "../hooks/useQueries";
import { extractBook } from "../lib/textExtraction";
import {
  AudiobookTTS,
  getAllEnglishVoices,
  getPreferredVoices,
} from "../lib/tts";

const SPEED_OPTIONS = [
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1.0 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2.0 },
];

const SAMPLE_TEXT = `It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness. It was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness. It was the spring of hope, it was the winter of despair. We had everything before us, we had nothing before us. We were all going direct to Heaven, we were all going direct the other way.

In short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only. There were a king with a large jaw and a queen with a plain face, on the throne of England; there were a king with a large jaw and a queen with a fair face, on the throne of France. In both countries it was clearer than crystal to the lords of the State preserves of loaves and fishes, that things in general were settled for ever.

It was the year of Our Lord one thousand seven hundred and seventy-five. Spiritual revelations were conceded to England at that favoured period, as at this. Mrs. Southcott had recently attained her five-and-twentieth blessed birthday, of whom a prophetic private in the Life Guards had heralded the sublime appearance by announcing that arrangements were made for the swallowing up of London and Westminster! Even the Cock-lane ghost had been laid only a round dozen of years, after rapping out its messages, as the spirits of this very year last past (supernaturally deficient in originality) rapped out theirs. Mere messages in the earthly order of events had lately come to the English Crown and People, from a congress of British subjects in America: which, strange to relate, have proved more important to the human race than any communications yet received through any of the chickens of the Cock-lane brood.`;

interface SentenceItemProps {
  sentence: string;
  index: number;
  isCurrent: boolean;
  onSelect: (i: number) => void;
  setRef: (el: HTMLButtonElement | null, i: number) => void;
}

function SentenceItem({
  sentence,
  index,
  isCurrent,
  onSelect,
  setRef,
}: SentenceItemProps) {
  return (
    <button
      type="button"
      ref={(el) => setRef(el, index)}
      className={`inline transition-all duration-300 text-left bg-transparent border-0 p-0 cursor-pointer ${
        isCurrent ? "sentence-highlight" : ""
      }`}
      style={{
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        color: "inherit",
      }}
      onClick={() => onSelect(index)}
      data-ocid={index < 3 ? `reader.item.${index + 1}` : undefined}
    >
      {sentence}{" "}
    </button>
  );
}

function renderSentences(
  sentences: string[],
  currentIdx: number,
  onSelect: (i: number) => void,
  setRef: (el: HTMLButtonElement | null, i: number) => void,
) {
  return sentences.map((s, i) => {
    const stableKey = `${s.slice(0, 30)}-${i}`;
    return (
      <SentenceItem
        key={stableKey}
        sentence={s}
        index={i}
        isCurrent={i === currentIdx}
        onSelect={onSelect}
        setRef={setRef}
      />
    );
  });
}

interface ReaderViewProps {
  book: BookMetadata;
  file?: File;
  onBack: () => void;
}

export default function ReaderView({ book, file, onBack }: ReaderViewProps) {
  const [sentences, setSentences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const sentenceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ttsRef = useRef<AudiobookTTS | null>(null);
  const { mutate: saveProgress } = useSaveReadingProgress();

  useEffect(() => {
    const tts = new AudiobookTTS();
    ttsRef.current = tts;
    tts.onSentenceStart = (idx) => setCurrentIdx(idx);
    tts.onPlaybackEnd = () => setIsPlaying(false);
    return () => tts.stop();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: voices effect runs once on mount
  useEffect(() => {
    const loadVoices = () => {
      const preferred = getPreferredVoices();
      const all = getAllEnglishVoices();
      const merged = [
        ...new Map([...preferred, ...all].map((v) => [v.name, v])).values(),
      ];
      setVoices(merged);
      setSelectedVoice((prev) => {
        if (prev) return prev;
        const best = preferred[0] || merged[0] || null;
        ttsRef.current?.setVoice(best);
        return best;
      });
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ttsRef is a stable ref
  useEffect(() => {
    const load = async () => {
      if (!file) {
        const sampleSentences =
          SAMPLE_TEXT.match(/[^.!?]+[.!?]+["'\u201D\u2019]?/g) || [];
        const cleaned = sampleSentences
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
        setSentences(cleaned);
        ttsRef.current?.setSentences(cleaned);
        return;
      }
      setLoading(true);
      try {
        const extracted = await extractBook(file);
        setSentences(extracted.sentences);
        ttsRef.current?.setSentences(extracted.sentences);
      } catch (e) {
        toast.error("Could not extract text from file.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [file, book.id]);

  useEffect(() => {
    sentenceRefs.current[currentIdx]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentIdx]);

  const setRef = useCallback((el: HTMLButtonElement | null, i: number) => {
    sentenceRefs.current[i] = el;
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      ttsRef.current?.pause();
      setIsPlaying(false);
      saveProgress({
        bookId: book.id,
        chapterIndex: BigInt(0),
        charOffset: BigInt(currentIdx),
        percentageComplete:
          sentences.length > 0 ? (currentIdx / sentences.length) * 100 : 0,
      });
    } else {
      ttsRef.current?.setSpeed(speed);
      if (selectedVoice) ttsRef.current?.setVoice(selectedVoice);
      ttsRef.current?.play();
      setIsPlaying(true);
    }
  }, [
    isPlaying,
    speed,
    selectedVoice,
    currentIdx,
    sentences.length,
    book.id,
    saveProgress,
  ]);

  const handleRewind = useCallback(() => {
    const newIdx = Math.max(0, currentIdx - 15);
    ttsRef.current?.pause();
    ttsRef.current?.setIndex(newIdx);
    setCurrentIdx(newIdx);
    setIsPlaying(false);
  }, [currentIdx]);

  const handleForward = useCallback(() => {
    const newIdx = Math.min(sentences.length - 1, currentIdx + 15);
    ttsRef.current?.pause();
    ttsRef.current?.setIndex(newIdx);
    setCurrentIdx(newIdx);
    setIsPlaying(false);
  }, [currentIdx, sentences.length]);

  const handleSpeedChange = useCallback((val: string) => {
    const n = Number.parseFloat(val);
    setSpeed(n);
    ttsRef.current?.setSpeed(n);
  }, []);

  const handleVoiceChange = useCallback(
    (val: string) => {
      const v = voices.find((vv) => vv.name === val) || null;
      setSelectedVoice(v);
      ttsRef.current?.setVoice(v);
    },
    [voices],
  );

  const handleSliderChange = useCallback(
    (vals: number[]) => {
      const idx = vals[0];
      const wasPlaying = isPlaying;
      ttsRef.current?.pause();
      ttsRef.current?.setIndex(idx);
      setCurrentIdx(idx);
      setIsPlaying(false);
      if (wasPlaying) {
        setTimeout(() => {
          ttsRef.current?.play();
          setIsPlaying(true);
        }, 100);
      }
    },
    [isPlaying],
  );

  const handleSentenceSelect = useCallback((i: number) => {
    ttsRef.current?.pause();
    ttsRef.current?.setIndex(i);
    setCurrentIdx(i);
    setIsPlaying(false);
  }, []);

  const progressPercent = useMemo(
    () =>
      sentences.length > 0
        ? Math.round((currentIdx / sentences.length) * 100)
        : 0,
    [currentIdx, sentences.length],
  );

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-[800px] mx-auto px-6 pt-8 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm mb-6 hover:opacity-80 transition-opacity"
          style={{ color: "oklch(0.62 0.03 55)" }}
          data-ocid="reader.back.button"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Library
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1
            className="font-serif text-3xl font-bold mb-1"
            style={{ color: "oklch(0.73 0.1 70)" }}
          >
            {book.title}
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.55 0.025 55)" }}>
            by {book.author}
          </p>
        </motion.div>
      </div>

      <main className="max-w-[800px] mx-auto px-6">
        {loading ? (
          <div
            className="flex flex-col items-center py-20 gap-3"
            data-ocid="reader.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "oklch(0.73 0.1 70)" }}
            />
            <p style={{ color: "oklch(0.55 0.025 55)" }}>Extracting text...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-8"
            style={{
              background: "oklch(0.148 0.022 40)",
              border: "1px solid oklch(0.24 0.025 45 / 0.5)",
            }}
            data-ocid="reader.panel"
          >
            <p className="reader-text">
              {renderSentences(
                sentences,
                currentIdx,
                handleSentenceSelect,
                setRef,
              )}
            </p>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="player-bar fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="max-w-[1200px] mx-auto px-6 py-3">
            <div className="mb-3">
              <Slider
                min={0}
                max={Math.max(0, sentences.length - 1)}
                step={1}
                value={[currentIdx]}
                onValueChange={handleSliderChange}
                className="w-full"
                data-ocid="reader.toggle"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "oklch(0.88 0.02 65)" }}
                >
                  {book.title}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "oklch(0.55 0.025 55)" }}
                >
                  {currentIdx + 1} / {sentences.length} sentences ·{" "}
                  {progressPercent}%
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRewind}
                  className="p-2 rounded-full transition-colors hover:bg-white/5"
                  title="Rewind 15"
                  data-ocid="reader.secondary_button"
                >
                  <SkipBack
                    className="w-5 h-5"
                    style={{ color: "oklch(0.75 0.025 60)" }}
                  />
                </button>
                <button
                  type="button"
                  onClick={handlePlay}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    background: "oklch(0.73 0.1 70)",
                    color: "oklch(0.12 0.018 42)",
                  }}
                  data-ocid="reader.primary_button"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5" fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  className="p-2 rounded-full transition-colors hover:bg-white/5"
                  title="Forward 15"
                  data-ocid="reader.secondary_button"
                >
                  <SkipForward
                    className="w-5 h-5"
                    style={{ color: "oklch(0.75 0.025 60)" }}
                  />
                </button>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                <Select value={String(speed)} onValueChange={handleSpeedChange}>
                  <SelectTrigger
                    className="w-20 h-8 text-xs border-0"
                    style={{
                      background: "oklch(0.20 0.025 40)",
                      color: "oklch(0.75 0.025 60)",
                    }}
                    data-ocid="reader.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.175 0.025 40)",
                      border: "1px solid oklch(0.28 0.025 45)",
                    }}
                  >
                    {SPEED_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={String(o.value)}
                        className="text-xs"
                        style={{ color: "oklch(0.85 0.02 65)" }}
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {voices.length > 0 && (
                  <Select
                    value={selectedVoice?.name || ""}
                    onValueChange={handleVoiceChange}
                  >
                    <SelectTrigger
                      className="w-36 h-8 text-xs border-0 hidden md:flex"
                      style={{
                        background: "oklch(0.20 0.025 40)",
                        color: "oklch(0.75 0.025 60)",
                      }}
                      data-ocid="reader.select"
                    >
                      <Volume2 className="w-3 h-3 mr-1 flex-shrink-0" />
                      <SelectValue placeholder="Voice" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "oklch(0.175 0.025 40)",
                        border: "1px solid oklch(0.28 0.025 45)",
                      }}
                    >
                      {voices.map((v) => (
                        <SelectItem
                          key={v.name}
                          value={v.name}
                          className="text-xs"
                          style={{ color: "oklch(0.85 0.02 65)" }}
                        >
                          {v.name.replace(/Microsoft|Google/g, "").trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
