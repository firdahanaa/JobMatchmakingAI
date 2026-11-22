import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  extractCvText,
  extractDocxText,
  extractPdfText,
  hasValidDocxStructure,
  normalizeExtractedText,
  structureCvText,
} from "./processing";
import { DOCX_MIME_TYPE } from "@/lib/validators/talent";

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

function createMinimalDocx(paragraphs: string[]): Uint8Array {
  const xmlBody = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${xmlBody}</w:body></w:document>`;

  const fileNameBytes = new TextEncoder().encode("word/document.xml");
  const uncompressed = new TextEncoder().encode(documentXml);
  const compressed = new Uint8Array(deflateRawSync(uncompressed));

  const localHeader = new Uint8Array(30 + fileNameBytes.length);
  const lv = new DataView(localHeader.buffer);
  lv.setUint32(0, 0x04034b50, true); // Local file header signature
  lv.setUint16(4, 20, true);
  lv.setUint16(8, 8, true); // Deflate
  lv.setUint32(18, compressed.length, true);
  lv.setUint32(22, uncompressed.length, true);
  lv.setUint16(26, fileNameBytes.length, true);
  localHeader.set(fileNameBytes, 30);

  const centralHeader = new Uint8Array(46 + fileNameBytes.length);
  const cv = new DataView(centralHeader.buffer);
  cv.setUint32(0, 0x02014b50, true); // Central dir signature
  cv.setUint16(4, 20, true);
  cv.setUint16(6, 20, true);
  cv.setUint16(10, 8, true); // Deflate
  cv.setUint32(20, compressed.length, true);
  cv.setUint32(24, uncompressed.length, true);
  cv.setUint16(28, fileNameBytes.length, true);
  cv.setUint32(42, 0, true); // Local header offset
  centralHeader.set(fileNameBytes, 46);

  const centralDirOffset = localHeader.length + compressed.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // EOCD signature
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, centralHeader.length, true);
  ev.setUint32(16, centralDirOffset, true);

  const zip = new Uint8Array(
    localHeader.length + compressed.length + centralHeader.length + eocd.length,
  );
  zip.set(localHeader, 0);
  zip.set(compressed, localHeader.length);
  zip.set(centralHeader, centralDirOffset);
  zip.set(eocd, centralDirOffset + centralHeader.length);
  return zip;
}

describe("CV DOCX processing", () => {
  it("extracts ATS text, entities, and structured sections from valid DOCX", async () => {
    const docxBytes = createMinimalDocx([
      "rahil@example.com",
      "RINGKASAN PROFESIONAL",
      "Mahasiswa Sistem Informasi &amp; Frontend Developer",
      "PENDIDIKAN",
      "S1 Sistem Informasi Universitas Gunadarma",
      "KETERAMPILAN",
      "React, TypeScript, Next.js, SQL",
    ]);

    expect(hasValidDocxStructure(docxBytes)).toBe(true);

    const result = await extractCvText(docxBytes, DOCX_MIME_TYPE);
    expect(result.status).toBe("completed");
    expect(result.text).toContain("Mahasiswa Sistem Informasi & Frontend Developer");
    expect(result.structuredData.email).toBe("rahil@example.com");
    expect(result.structuredData.educationHistory).toEqual([
      "S1 Sistem Informasi Universitas Gunadarma",
    ]);
    expect(result.structuredData.skills).toEqual(["React", "TypeScript", "Next.js", "SQL"]);
  });

  it("marks DOCX with almost no text as needs_ocr and rejects invalid DOCX bytes", async () => {
    const emptyDocx = createMinimalDocx([""]);
    const emptyResult = await extractDocxText(emptyDocx);
    expect(emptyResult.status).toBe("needs_ocr");

    const invalidBytes = new TextEncoder().encode("not a docx zip archive");
    expect(hasValidDocxStructure(invalidBytes)).toBe(false);
    await expect(extractDocxText(invalidBytes)).rejects.toThrow();
  });
});
