import { inflateRawSync } from "node:zlib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { DOCX_MIME_TYPE } from "@/lib/validators/talent";

export const MAX_CV_PAGES = 40;
export const MAX_EXTRACTED_CV_CHARACTERS = 1_000_000;
const MAX_DOCX_XML_BYTES = 10 * 1024 * 1024;

export interface OcrProvider {
  recognize(pdfBytes: Uint8Array): Promise<string>;
}

export interface StructuredCvData {
  email: string | null;
  phone: string | null;
  professionalSummary: string[];
  educationHistory: string[];
  workExperience: string[];
  skills: string[];
  pageCount: number;
}

export type CvExtractionResult =
  | {
      status: "completed";
      text: string;
      structuredData: StructuredCvData;
      pageCount: number;
      error: null;
    }
  | {
      status: "needs_ocr";
      text: string;
      structuredData: StructuredCvData;
      pageCount: number;
      error: string;
    };

type CvSection =
  | "professionalSummary"
  | "educationHistory"
  | "workExperience"
  | "skills";

const SECTION_HEADERS: Record<CvSection, RegExp> = {
  professionalSummary: /^(professional summary|summary|profile|about me|ringkasan profesional|tentang saya)$/i,
  educationHistory: /^(education|education history|academic background|pendidikan|riwayat pendidikan)$/i,
  workExperience: /^(work experience|experience|employment history|pengalaman kerja|pengalaman profesional)$/i,
  skills: /^(skills|technical skills|core skills|keahlian|keterampilan)$/i,
};

export function normalizeExtractedText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function structureCvText(text: string, pageCount: number): StructuredCvData {
  const lines = text.split("\n");
  const sections: Record<CvSection, string[]> = {
    professionalSummary: [],
    educationHistory: [],
    workExperience: [],
    skills: [],
  };
  let activeSection: CvSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const header = (Object.entries(SECTION_HEADERS) as [CvSection, RegExp][]).find(
      ([, pattern]) => pattern.test(line.replace(/:$/, "")),
    );

    if (header) {
      activeSection = header[0];
      continue;
    }

    if (activeSection) {
      sections[activeSection].push(line);
    }
  }

  const email = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null;
  const phone = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d[\d\s().-]{6,}\d/)?.[0]
    ?.replace(/\s+/g, " ")
    .trim() ?? null;

  return {
    email,
    phone,
    professionalSummary: sections.professionalSummary,
    educationHistory: sections.educationHistory,
    workExperience: sections.workExperience,
    skills: sections.skills.flatMap((line) =>
      line.split(/[,;|•]/).map((skill) => skill.trim()).filter(Boolean),
    ),
    pageCount,
  };
}

export async function extractPdfText(
  pdfBytes: Uint8Array,
  ocrProvider?: OcrProvider,
): Promise<CvExtractionResult> {
  const loadingTask = getDocument({
    data: pdfBytes,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  try {
    const document = await loadingTask.promise;
    if (document.numPages < 1) {
      throw new Error("PDF tidak memiliki halaman yang dapat dibaca.");
    }
    if (document.numPages > MAX_CV_PAGES) {
      throw new Error(`CV maksimal ${MAX_CV_PAGES} halaman.`);
    }

    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(
        content.items
          .filter((item) => "str" in item)
          .map((item) =>
            "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "",
          )
          .join("")
      );
    }

    let text = normalizeExtractedText(pageTexts.join("\n"));
    if (text.length < 20 && ocrProvider) {
      text = normalizeExtractedText(await ocrProvider.recognize(pdfBytes));
    }

    if (text.length > MAX_EXTRACTED_CV_CHARACTERS) {
      throw new Error("Hasil ekstraksi CV terlalu besar untuk diproses.");
    }

    const structuredData = structureCvText(text, document.numPages);
    if (text.length < 20) {
      return {
        status: "needs_ocr",
        text,
        structuredData,
        pageCount: document.numPages,
        error: "PDF tidak memiliki teks yang dapat dibaca; mungkin berupa scan atau kosong. Diperlukan OCR.",
      };
    }

    return {
      status: "completed",
      text,
      structuredData,
      pageCount: document.numPages,
      error: null,
    };
  } finally {
    await loadingTask.destroy();
  }
}

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos") return "'";
      if (lower.startsWith("#x")) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (lower.startsWith("#")) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    },
  );
}

function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 22 || view.getUint32(0, true) !== 0x04034b50) {
    throw new Error("Berkas DOCX tidak valid atau bukan arsip dokumen Word.");
  }

  // Locate End of Central Directory (EOCD) record (signature 0x06054b50)
  const minEocdOffset = Math.max(0, bytes.byteLength - 65557);
  let eocdOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= minEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Struktur arsip DOCX rusak (EOCD tidak ditemukan).");
  }

  const centralDirSize = view.getUint32(eocdOffset + 12, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  if (centralDirOffset + centralDirSize > bytes.byteLength) {
    throw new Error("Struktur arsip DOCX tidak valid.");
  }

  const decoder = new TextDecoder("utf-8");
  const entries = new Map<string, Uint8Array>();
  let cursor = centralDirOffset;
  const end = centralDirOffset + centralDirSize;

  while (cursor + 46 <= end) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const fileName = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + fileNameLength),
    );
    cursor += 46 + fileNameLength + extraLength + commentLength;

    const isRelevantXml =
      fileName === "word/document.xml" ||
      /^word\/(header|footer)\d+\.xml$/i.test(fileName);
    if (!isRelevantXml) {
      continue;
    }

    if (uncompressedSize > MAX_DOCX_XML_BYTES) {
      throw new Error("Ukuran konten XML DOCX melebihi batas aman.");
    }
    if (localHeaderOffset + 30 > bytes.byteLength) {
      throw new Error("Header arsip DOCX rusak.");
    }
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      throw new Error("Signature entri DOCX tidak valid.");
    }

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.byteLength) {
      throw new Error("Data arsip DOCX terpotong atau rusak.");
    }

    const rawSlice = bytes.subarray(dataStart, dataEnd);
    let content: Uint8Array;
    if (compressionMethod === 0) {
      content = rawSlice;
    } else if (compressionMethod === 8) {
      content = new Uint8Array(
        inflateRawSync(rawSlice, { maxOutputLength: MAX_DOCX_XML_BYTES }),
      );
    } else {
      throw new Error(`Metode kompresi DOCX (${compressionMethod}) tidak didukung.`);
    }

    entries.set(fileName, content);
  }

  return entries;
}

function extractTextFromWordXml(xml: string): string {
  // Preserve paragraph, line break, tab, and table cell boundaries before stripping tags
  const withBreaks = xml
    .replace(/<w:tab\b[^>]*\/>/gi, "\t")
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, "\n")
    .replace(/<\/w:tc>/gi, " | ")
    .replace(/<\/w:(?:p|tr)>/gi, "\n");

  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeXmlEntities(stripped);
}

/**
 * Memverifikasi apakah buffer biner merupakan dokumen DOCX valid (berisi word/document.xml).
 */
export function hasValidDocxStructure(bytes: Uint8Array): boolean {
  try {
    const entries = readZipEntries(bytes);
    return entries.has("word/document.xml");
  } catch {
    return false;
  }
}

/**
 * Mengekstrak teks dan struktur CV dari dokumen DOCX standar ATS tanpa dependensi eksternal.
 */
export async function extractDocxText(
  docxBytes: Uint8Array,
): Promise<CvExtractionResult> {
  const entries = readZipEntries(docxBytes);
  const documentXmlBytes = entries.get("word/document.xml");
  if (!documentXmlBytes) {
    throw new Error("Berkas DOCX tidak memiliki isi dokumen (word/document.xml).");
  }

  const decoder = new TextDecoder("utf-8");
  const xmlParts: string[] = [];

  for (const [name, content] of entries) {
    if (/^word\/header\d+\.xml$/i.test(name)) {
      xmlParts.push(extractTextFromWordXml(decoder.decode(content)));
    }
  }
  xmlParts.push(extractTextFromWordXml(decoder.decode(documentXmlBytes)));
  for (const [name, content] of entries) {
    if (/^word\/footer\d+\.xml$/i.test(name)) {
      xmlParts.push(extractTextFromWordXml(decoder.decode(content)));
    }
  }

  const text = normalizeExtractedText(xmlParts.join("\n"));
  if (text.length > MAX_EXTRACTED_CV_CHARACTERS) {
    throw new Error("Hasil ekstraksi CV terlalu besar untuk diproses.");
  }

  const structuredData = structureCvText(text, 1);
  if (text.length < 20) {
    return {
      status: "needs_ocr",
      text,
      structuredData,
      pageCount: 1,
      error:
        "DOCX tidak memiliki teks yang dapat dibaca; mungkin hanya berisi gambar atau kosong.",
    };
  }

  return {
    status: "completed",
    text,
    structuredData,
    pageCount: 1,
    error: null,
  };
}

/**
 * Menjalankan ekstraksi teks CV sesuai tipe berkas (PDF atau DOCX).
 */
export async function extractCvText(
  bytes: Uint8Array,
  contentType: string,
  ocrProvider?: OcrProvider,
): Promise<CvExtractionResult> {
  if (contentType === DOCX_MIME_TYPE || contentType.toLowerCase().endsWith(".docx")) {
    return extractDocxText(bytes);
  }
  return extractPdfText(bytes, ocrProvider);
}
