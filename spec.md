# Audiobook Reader

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- File upload for epub, pdf, and txt documents
- Cloud storage for uploaded books
- Text extraction from PDF (pdf.js), EPUB (epub.js), and plain text files
- Library view listing all uploaded books
- Reader view displaying extracted text by chapter/section
- Text-to-speech engine using Web Speech API with natural voice selection
- Emotion/tone detection engine analyzing text patterns:
  - Exclamation marks -> elevated pitch/energy
  - Questions -> rising intonation cues
  - Ellipses and long sentences -> slower pace, longer pauses
  - Dialogue (quoted text) -> slight pitch shift
  - Short punchy sentences -> quicker delivery
  - Capitalized words -> emphasis
- Audiobook playback controls: play/pause, rewind 10s, forward 10s, speed (0.75x-2x), voice selector
- Auto-scroll synchronized with speech position
- Reading progress saved per book
- Dark/light mode for comfortable reading

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Backend: store book metadata (title, author, file type, upload date, progress) with blob-storage for file data; authorization for user accounts
2. Backend APIs: uploadBook, listBooks, deleteBook, saveProgress, getProgress
3. Frontend library: pdf.js for PDF text extraction, epub.js for EPUB parsing
4. Frontend TTS engine: wrapper around Web Speech API with emotion analysis preprocessing
5. Emotion analyzer: regex/pattern rules to annotate text chunks with speech parameters (rate, pitch, pause duration)
6. UI: library page, reader page with floating player bar, voice/speed settings panel
7. Sync highlight of current sentence being spoken
