/**
 * Normalisasi nomor WhatsApp ke standar internasional tanpa tanda tambah (628xxx).
 * Menerima format: 08xx, +628xx, 628xx, spasi, strip, tanda kurung.
 * Validasi: 10 - 15 digit numerik total.
 */
export function normalizeWhatsAppNumber(input: string): string {
  if (!input || typeof input !== "string") {
    throw new Error("Nomor WhatsApp tidak boleh kosong.");
  }

  // Hapus semua karakter pemisah: spasi, strip, kurung, titik
  let cleaned = input.replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  if (!/^\d+$/.test(cleaned)) {
    throw new Error("Nomor WhatsApp hanya boleh berisi angka.");
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error("Panjang nomor WhatsApp harus antara 10 sampai 15 digit.");
  }

  if (!cleaned.startsWith("62")) {
    throw new Error("Nomor WhatsApp harus berawalan kode negara 62 atau 08.");
  }

  return cleaned;
}

/**
 * Membentuk tautan wa.me dengan nomor ternormalisasi dan teks awal opsional.
 */
export function buildWhatsAppLink(number: string, prefillText?: string): string {
  const normalized = normalizeWhatsAppNumber(number);
  const base = `https://wa.me/${normalized}`;
  if (!prefillText || !prefillText.trim()) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(prefillText.trim())}`;
}
