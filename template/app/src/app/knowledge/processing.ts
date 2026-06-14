import * as cheerio from "cheerio";

export function chunkText(text: string, maxChunkSize = 1500): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  const sentences = normalized.match(/[^.!?]+[.!?]*\s*/g) ?? [normalized];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  return chunks;
}

export async function extractHtmlText(html: string): Promise<string> {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, iframe, noscript").remove();
  const body = $("body") ?? $("html");
  const text = body
    .find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, code, div")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0)
    .join("\n\n");
  return text || $.root().text().trim();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    throw new Error(`PDF parsing failed: ${(err as Error).message}`);
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err) {
    throw new Error(`DOCX parsing failed: ${(err as Error).message}`);
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string,
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "txt":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export function getFileType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "txt") return "txt";
  return null;
}
