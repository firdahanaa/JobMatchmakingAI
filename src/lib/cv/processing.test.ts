import { describe, expect, it } from "vitest";
import {
  extractPdfText,
  normalizeExtractedText,
  structureCvText,
} from "./processing";

function createPdf(text: string): Uint8Array {
  const stream = text
    ? `BT /F1 12 Tf 40 250 Td (${text.replace(/[\\()]/g, "\\$&")}) Tj ET`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];

  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(document).length);
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = new TextEncoder().encode(document).length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(document);
}

describe("CV PDF processing", () => {
  it("extracts selectable PDF text and detects scanned PDFs without fabricating data", async () => {
    const result = await extractPdfText(createPdf("jane@example.com Senior engineer"));
    expect(result.status).toBe("completed");
    expect(result.text).toContain("jane@example.com");
    expect(result.structuredData.email).toBe("jane@example.com");

    const scanned = await extractPdfText(createPdf(""));
    expect(scanned.status).toBe("needs_ocr");
    expect(scanned.text).toBe("");
    expect(scanned.structuredData.email).toBeNull();
    expect(scanned.error).toContain("OCR");
  });

  it("uses the OCR interface only when PDF text is sparse", async () => {
    const result = await extractPdfText(createPdf(""), {
      recognize: async () => "Extracted text supplied by OCR.",
    });

    expect(result.status).toBe("completed");
    expect(result.text).toBe("Extracted text supplied by OCR.");
  });

  it("normalizes text and structures only explicitly labeled resume sections", () => {
    expect(normalizeExtractedText("  Profile \r\n\r\n  Jane\tDoe  \u0000 ")).toBe("Profile\nJane Doe");

    const structured = structureCvText(
      [
        "jane@example.com",
        "EDUCATION",
        "BSc Computer Science",
        "WORK EXPERIENCE",
        "Frontend Developer, Studio A",
        "SKILLS",
        "TypeScript, React",
      ].join("\n"),
      2,
    );

    expect(structured.email).toBe("jane@example.com");
    expect(structured.educationHistory).toEqual(["BSc Computer Science"]);
    expect(structured.workExperience).toEqual(["Frontend Developer, Studio A"]);
    expect(structured.skills).toEqual(["TypeScript", "React"]);
  });

  it("rejects malformed or unreadable PDF data", async () => {
    await expect(extractPdfText(new TextEncoder().encode("not a PDF"))).rejects.toThrow();
  });
});
