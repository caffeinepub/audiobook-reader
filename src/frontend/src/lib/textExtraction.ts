export interface ExtractedBook {
  title: string;
  author: string;
  sentences: string[];
  chapters: Chapter[];
}

export interface Chapter {
  title: string;
  sentenceStart: number;
  sentenceEnd: number;
}

function splitIntoSentences(text: string): string[] {
  const raw = text.match(/[^.!?\u2026]+[.!?\u2026]+["'\u201D\u2019]?/g) || [];
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.split(/\s+/).length > 1);
}

function groupIntoChapters(sentences: string[], chunkSize = 50): Chapter[] {
  const chapters: Chapter[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, sentences.length) - 1;
    chapters.push({
      title: `Chapter ${Math.floor(i / chunkSize) + 1}`,
      sentenceStart: i,
      sentenceEnd: end,
    });
  }
  return chapters;
}

function extractTitleAuthor(filename: string): {
  title: string;
  author: string;
} {
  const base = filename.replace(/\.(pdf|epub|txt)$/i, "");
  const dashMatch = base.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    return { author: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }
  return { title: base, author: "Unknown Author" };
}

export async function extractFromTxt(file: File): Promise<ExtractedBook> {
  const text = await file.text();
  const { title, author } = extractTitleAuthor(file.name);
  const sentences = splitIntoSentences(text);
  const chapters = groupIntoChapters(sentences);
  return { title, author, sentences, chapters };
}

export async function extractFromPdf(file: File): Promise<ExtractedBook> {
  const { title, author } = extractTitleAuthor(file.name);
  const arrayBuffer = await file.arrayBuffer();

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += `${pageText} `;
  }

  const sentences = splitIntoSentences(fullText);
  const chapters = groupIntoChapters(sentences);
  return { title, author, sentences, chapters };
}

export async function extractFromEpub(file: File): Promise<ExtractedBook> {
  const { title: fallbackTitle, author: fallbackAuthor } = extractTitleAuthor(
    file.name,
  );
  const arrayBuffer = await file.arrayBuffer();

  const ePub = (await import("epubjs")).default;
  const book = ePub(arrayBuffer);
  await book.ready;

  const metadata = book.packaging?.metadata;
  const title = metadata?.title || fallbackTitle;
  const author = metadata?.creator || fallbackAuthor;

  // Access spine items via unknown to avoid strict type conflicts
  const spineItems = (book.spine as unknown as { items: { href: string }[] })
    .items;
  const chapters: Chapter[] = [];
  let allSentences: string[] = [];

  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i];
    try {
      const sectionRaw = await book.load(item.href);
      const sectionStr =
        typeof sectionRaw === "string"
          ? sectionRaw
          : (sectionRaw as unknown as { toString(): string }).toString();
      const doc = new DOMParser().parseFromString(sectionStr, "text/html");
      const text = doc.body?.innerText || doc.body?.textContent || "";
      if (!text.trim()) continue;

      const sents = splitIntoSentences(text);
      if (sents.length === 0) continue;

      chapters.push({
        title: `Chapter ${i + 1}`,
        sentenceStart: allSentences.length,
        sentenceEnd: allSentences.length + sents.length - 1,
      });
      allSentences = allSentences.concat(sents);
    } catch {
      // skip unreadable sections
    }
  }

  if (chapters.length === 0) {
    return {
      title,
      author,
      sentences: allSentences,
      chapters: groupIntoChapters(allSentences),
    };
  }

  return { title, author, sentences: allSentences, chapters };
}

export async function extractBook(file: File): Promise<ExtractedBook> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return extractFromPdf(file);
  if (ext === "epub") return extractFromEpub(file);
  return extractFromTxt(file);
}
