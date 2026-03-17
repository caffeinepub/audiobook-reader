// Text-to-Speech Engine with Emotion Detection

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

export interface SentenceAnalysis {
  rate: number;
  pitch: number;
  pauseBefore: number;
  pauseAfter: number;
}

export function analyzeSentence(sentence: string): SentenceAnalysis {
  const trimmed = sentence.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  let rate = 0.92;
  let pitch = 1.0;
  let pauseBefore = 0;
  let pauseAfter = 120;

  // Exclamation
  if (trimmed.endsWith("!")) {
    rate = 1.1;
    pitch = 1.15;
    pauseAfter = 200;
  }
  // Question
  else if (trimmed.endsWith("?")) {
    rate = 0.95;
    pitch = 1.1;
    pauseAfter = 350;
  }
  // Ellipsis
  else if (trimmed.endsWith("...")) {
    rate = 0.85;
    pitch = 0.95;
    pauseAfter = 500;
  }

  // Dialogue (text contains quotes)
  if (/["|\u201C\u201D'\u2018\u2019]/.test(trimmed)) {
    pitch = Math.max(pitch, 1.05);
    rate = Math.min(rate, 1.0);
  }

  // ALL CAPS words (emphasis)
  if (/\b[A-Z]{2,}\b/.test(trimmed)) {
    rate = Math.min(rate, 0.9);
    pitch = Math.max(pitch, 1.1);
  }

  // Short sentence
  if (wordCount < 6) {
    rate = Math.max(rate, 1.05);
  }

  // Long sentence
  if (wordCount > 25) {
    rate = Math.min(rate, 0.9);
  }

  return { rate, pitch, pauseBefore, pauseAfter };
}

export function getPreferredVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter(
    (v) => v.lang.startsWith("en") || v.lang.startsWith("EN"),
  );

  const preferred = english.filter(
    (v) =>
      v.name.includes("Google") ||
      v.name.includes("Premium") ||
      v.name.includes("Enhanced"),
  );

  return preferred.length > 0 ? preferred : english;
}

export function getAllEnglishVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en") || v.lang.startsWith("EN"));
}

export class AudiobookTTS {
  private synth = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private sentences: string[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private speedMultiplier = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;

  public onSentenceStart?: (index: number) => void;
  public onSentenceEnd?: (index: number) => void;
  public onPlaybackEnd?: () => void;
  public onError?: (err: string) => void;

  setSentences(sentences: string[]) {
    this.sentences = sentences;
    this.currentIndex = 0;
  }

  setVoice(voice: SpeechSynthesisVoice | null) {
    this.selectedVoice = voice;
  }

  setSpeed(multiplier: number) {
    this.speedMultiplier = multiplier;
  }

  setIndex(index: number) {
    this.currentIndex = Math.max(0, Math.min(index, this.sentences.length - 1));
  }

  getIndex() {
    return this.currentIndex;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  play() {
    if (this.isPlaying) return;
    if (this.currentIndex >= this.sentences.length) {
      this.currentIndex = 0;
    }
    this.isPlaying = true;
    this.speakNext();
  }

  pause() {
    this.isPlaying = false;
    this.synth.cancel();
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
  }

  private speakNext() {
    if (!this.isPlaying || this.currentIndex >= this.sentences.length) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    const sentence = this.sentences[this.currentIndex];
    if (!sentence?.trim()) {
      this.currentIndex++;
      this.speakNext();
      return;
    }

    const analysis = analyzeSentence(sentence);
    const idx = this.currentIndex;

    // Check for paragraph break (empty previous sentence indicator or newline)
    const isParagraphBreak = idx > 0 && this.sentences[idx - 1]?.includes("\n");

    const doPause = (ms: number, cb: () => void) => {
      if (!this.isPlaying) return;
      this.pauseTimeout = setTimeout(cb, ms);
    };

    const speak = () => {
      if (!this.isPlaying) return;

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = analysis.rate * this.speedMultiplier;
      utterance.pitch = analysis.pitch;
      utterance.volume = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onstart = () => {
        this.onSentenceStart?.(idx);
      };

      utterance.onend = () => {
        this.onSentenceEnd?.(idx);
        if (!this.isPlaying) return;
        this.currentIndex++;
        if (analysis.pauseAfter > 0) {
          doPause(analysis.pauseAfter, () => this.speakNext());
        } else {
          this.speakNext();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          this.onError?.(e.error);
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    };

    if (isParagraphBreak) {
      doPause(800, speak);
    } else if (analysis.pauseBefore > 0) {
      doPause(analysis.pauseBefore, speak);
    } else {
      speak();
    }
  }
}
