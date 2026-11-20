import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const MAX_CV_PAGES = 40;
export const MAX_EXTRACTED_CV_CHARACTERS = 1_000_000;

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
