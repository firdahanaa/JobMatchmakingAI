/**
 * Menghapus spasi di awal/akhir dan memastikan isi pesan 1-2000 karakter.
 */
export function sanitizeMessageBody(text: string): string {
  if (!text || typeof text !== "string") {
    throw new Error("Isi pesan tidak boleh kosong.");
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Isi pesan tidak boleh kosong.");
  }

  if (trimmed.length > 2000) {
    throw new Error("Isi pesan tidak boleh melebihi 2000 karakter.");
  }

  return trimmed;
}

export interface TextSegment {
  type: "text";
  content: string;
}

export interface LinkSegment {
  type: "link";
  content: string;
  href: string;
  target: "_blank";
  rel: "noopener noreferrer nofollow";
}

export type MessageSegment = TextSegment | LinkSegment;

/**
 * Memecah teks menjadi segmen teks dan tautan yang aman.
 * HANYA protokol http:// dan https:// yang diubah menjadi tautan.
 * Protokol javascript:, data:, file:, dll. tetap sebagai teks biasa.
 */
export function linkify(text: string): MessageSegment[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const segments: MessageSegment[] = [];
  // Regex mencari URL dengan awalan http:// atau https://
  const urlRegex = /(https?:\/\/[^\s<>()]+)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    let rawUrl = match[0];

    // Potong tanda baca di akhir URL jika ada (.,;:!?)"'] dsb)
    let trailingPunctuation = "";
    while (/[.,;:!?)"'\]]$/.test(rawUrl)) {
      trailingPunctuation = rawUrl.slice(-1) + trailingPunctuation;
      rawUrl = rawUrl.slice(0, -1);
    }

    if (rawUrl.length === 0) {
      continue;
    }

    // Tambahkan teks sebelum match jika ada
    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, matchIndex),
      });
    }

    // Validasi URL secara ketat
    let isValidHttpUrl = false;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        isValidHttpUrl = true;
      }
    } catch {
      isValidHttpUrl = false;
    }

    if (isValidHttpUrl) {
      segments.push({
        type: "link",
        content: rawUrl,
        href: rawUrl,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      });
    } else {
      segments.push({
        type: "text",
        content: rawUrl,
      });
    }

    // Kembalikan tanda baca akhir sebagai segmen teks
    if (trailingPunctuation) {
      segments.push({
        type: "text",
        content: trailingPunctuation,
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Tambahkan sisa teks setelah match terakhir
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

export type SystemMessageEvent =
  | "application_created"
  | "application_accepted"
  | "application_rejected"
  | "work_submitted"
  | "revision_requested"
  | "work_approved"
  | "payment_awaiting"
  | "payment_paid"
  | "application_completed";

export interface SystemMessageContext {
  projectTitle?: string;
  revisionNotes?: string;
  [key: string]: unknown;
}

/**
 * Membentuk teks pesan sistem standar tanpa membocorkan data sensitif.
 */
export function formatSystemMessage(
  event: SystemMessageEvent,
  ctx?: SystemMessageContext
): string {
  switch (event) {
    case "application_created":
      return ctx?.projectTitle
        ? `Lamaran diajukan untuk proyek "${ctx.projectTitle}". Percakapan dibuka.`
        : "Lamaran diajukan. Percakapan dibuka.";

    case "application_accepted":
      return "Lamaran diterima oleh vendor. Talent dapat mulai mengerjakan proyek.";

    case "application_rejected":
      return "Lamaran tidak diterima oleh vendor. Percakapan beralih ke mode hanya-baca.";

    case "work_submitted":
      return "Talent telah menyerahkan hasil pengerjaan proyek untuk ditinjau oleh vendor.";

    case "revision_requested":
      return ctx?.revisionNotes && ctx.revisionNotes.trim().length > 0
        ? `Vendor meminta revisi hasil pengerjaan. Catatan: "${ctx.revisionNotes.trim()}"`
        : "Vendor meminta revisi hasil pengerjaan.";

    case "work_approved":
      return "Hasil pengerjaan proyek telah disetujui oleh vendor.";

    case "payment_awaiting":
      return "Hasil disetujui. Tagihan pembayaran telah dibuat dan menunggu penyelesaian dari vendor.";

    case "payment_paid":
      return "Pembayaran proyek telah berhasil diverifikasi oleh sistem.";

    case "application_completed":
      return "Proyek dan lamaran telah selesai. Percakapan beralih ke mode hanya-baca.";

    default:
      return "Pembaruan status pada proyek/lamaran.";
  }
}

export interface ResolveOtherPartyNameOptions {
  isMeTalent: boolean;
  directProfileName?: string | null;
  embeddedProfileName?: string | null;
  vendorOrgName?: string | null;
  applicationMessage?: string | null;
}

/**
 * Menyelesaikan nama pihak lawan dalam percakapan:
 * - Jika user adalah Talent, tampilkan nama organisasi Vendor atau nama akunnya.
 * - Jika user adalah Vendor, tampilkan NAMA ASLI pelamar/talent, bukan placeholder 'Talenta'.
 */
export function resolveOtherPartyName(options: ResolveOtherPartyNameOptions): string {
  const {
    isMeTalent,
    directProfileName,
    embeddedProfileName,
    vendorOrgName,
    applicationMessage,
  } = options;

  if (isMeTalent) {
    return (
      vendorOrgName?.trim() ||
      directProfileName?.trim() ||
      embeddedProfileName?.trim() ||
      "Organisasi Vendor"
    );
  }

  // Sisi Vendor melihat nama Talent / Pelamar
  const isGeneric = (val?: string | null) => {
    if (!val) return true;
    const clean = val.trim().toLowerCase();
    return clean === "" || clean === "talenta" || clean === "talent" || clean === "pengguna";
  };

  if (!isGeneric(directProfileName)) {
    return directProfileName!.trim();
  }

  if (!isGeneric(embeddedProfileName)) {
    return embeddedProfileName!.trim();
  }

  // Jika nama di profiles masih kosong atau bernilai default 'Talenta',
  // ekstrak dari metadata kontak [Kontak: email] pada pesan lamaran
  if (applicationMessage && typeof applicationMessage === "string") {
    const emailMatch = applicationMessage.match(/\[Kontak:\s*([^\]]+)\]/);
    if (emailMatch && emailMatch[1]) {
      const email = emailMatch[1].trim();
      const localPart = email.split("@")[0];
      const words = localPart
        .replace(/[._+-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      if (words.length > 0) {
        return words.join(" ");
      }
    }
  }

  if (!isGeneric(directProfileName)) return directProfileName!.trim();
  if (!isGeneric(embeddedProfileName)) return embeddedProfileName!.trim();
  return "Pelamar Proyek";
}

