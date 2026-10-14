import { z } from "zod";

export const MEETING_PLATFORMS = ["google_meet", "zoom", "offline", "other"] as const;
export type MeetingPlatform = (typeof MEETING_PLATFORMS)[number];
export type MeetingStatus = "proposed" | "confirmed" | "declined";

/**
 * Skema validasi usulan meeting chat.
 */
export const meetingProposalSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Judul meeting wajib diisi.")
      .max(80, "Judul meeting maksimal 80 karakter."),
    startsAt: z
      .string()
      .trim()
      .min(1, "Waktu meeting wajib diisi.")
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && date.getTime() > Date.now();
        },
        { message: "Waktu meeting harus di masa depan." }
      ),
    durationMinutes: z
      .number()
      .int("Durasi meeting harus berupa angka bulat.")
      .min(15, "Durasi meeting minimal 15 menit.")
      .max(240, "Durasi meeting maksimal 240 menit (4 jam)."),
    platform: z.enum(MEETING_PLATFORMS),
    link: z
      .string()
      .trim()
      .url("Tautan meeting harus berupa URL yang valid.")
      .regex(/^https?:\/\//i, "Tautan meeting harus menggunakan protokol http atau https.")
      .optional()
      .or(z.literal(""))
      .nullable(),
    location: z
      .string()
      .trim()
      .max(200, "Lokasi maksimal 200 karakter.")
      .optional()
      .or(z.literal(""))
      .nullable(),
    note: z
      .string()
      .trim()
      .max(300, "Catatan maksimal 300 karakter.")
      .optional()
      .or(z.literal(""))
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.platform === "offline") {
        return !!data.location && data.location.trim().length > 0;
      }
      return true;
    },
    {
      message: "Lokasi wajib diisi untuk meeting tatap muka (offline).",
      path: ["location"],
    }
  );

export type MeetingProposalInput = z.infer<typeof meetingProposalSchema>;

export interface MeetingMetadataPayload extends MeetingProposalInput {
  status: MeetingStatus;
  proposedBy: string;
  confirmedAt?: string;
  declinedAt?: string;
  responseNote?: string;
}

/**
 * Format Date ke standar UTC iCalendar (YYYYMMDDTHHmmssZ).
 */
function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Membentuk string file .ics (iCalendar RFC 5545) yang valid.
 */
export function buildIcs(
  meeting: Pick<MeetingProposalInput, "title" | "startsAt" | "durationMinutes" | "platform" | "link" | "location" | "note">,
  organizerName: string
): string {
  const startDate = new Date(meeting.startsAt);
  const endDate = new Date(startDate.getTime() + meeting.durationMinutes * 60 * 1000);
  const now = new Date();

  const uid = `meeting-${startDate.getTime()}-${Math.random().toString(36).slice(2, 9)}@jobmatchmaking.ai`;
  const locationText =
    meeting.platform === "offline"
      ? meeting.location || "Tatap Muka"
      : meeting.link || meeting.location || meeting.platform.toUpperCase();

  const cleanDescription = (meeting.note || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

  const cleanSummary = meeting.title
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

  const cleanLocation = locationText
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

  const cleanOrganizer = organizerName
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/"/g, "'");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobMatchmakingAI//Chat Meeting//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(startDate)}`,
    `DTEND:${formatIcsUtc(endDate)}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    "STATUS:CONFIRMED",
    `ORGANIZER;CN="${cleanOrganizer}":mailto:noreply@jobmatchmaking.ai`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
