/**
 * Mendeteksi zona waktu Indonesia berdasarkan offset browser.
 * UTC+7: WIB, UTC+8: WITA, UTC+9: WIT.
 */
export function getTimezoneLabel(date = new Date()): string {
  const offsetMinutes = date.getTimezoneOffset(); // Misal UTC+7 -> -420
  if (offsetMinutes === -420) return "WIB";
  if (offsetMinutes === -480) return "WITA";
  if (offsetMinutes === -540) return "WIT";

  // Fallback untuk zona waktu lain
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz || "WIB";
}

/**
 * Format jam dan menit dengan label zona waktu (mis. "14:30 WIB").
 */
export function formatMessageTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const tz = getTimezoneLabel(d);
    return `${hours}:${minutes} ${tz}`;
  } catch {
    return "";
  }
}

/**
 * Format tanggal dan jam lengkap untuk usulan meeting.
 * Misal: "Kamis, 15 Oktober 2026 pukul 14:00 WIB"
 */
export function formatMeetingDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dateFormatted = d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const tz = getTimezoneLabel(d);
    return `${dateFormatted} pukul ${hours}:${minutes} ${tz}`;
  } catch {
    return dateString;
  }
}

/**
 * Format waktu relatif untuk pratinjau daftar percakapan.
 * Mis. "Baru saja", "5 mnt lalu", "1 jam lalu", "Kemarin", "14 Okt".
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return "Kemarin";
    if (diffDay < 7) return `${diffDay} hari lalu`;

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

/**
 * Format pemisah tanggal di dalam thread chat.
 * "Hari ini", "Kemarin", atau "Kamis, 15 Oktober 2026".
 */
export function formatDateSeparator(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return "Hari ini";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Kemarin";

    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
