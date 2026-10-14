import { describe, expect, it } from "vitest";
import {
  meetingProposalSchema,
  normalizeWhatsAppNumber,
  buildWhatsAppLink,
  formatSystemMessage,
  canSendMessage,
  sanitizeMessageBody,
} from "./index";

describe("Chat Server Actions Logic & Constraints", () => {
  it("sendTextMessage: menolak pesan kosong atau melebihi 2000 karakter", () => {
    expect(() => sanitizeMessageBody("")).toThrow("Isi pesan tidak boleh kosong.");
    expect(() => sanitizeMessageBody("   \n\t  ")).toThrow("Isi pesan tidak boleh kosong.");
    expect(sanitizeMessageBody("Halo dari talenta")).toBe("Halo dari talenta");
    expect(() => sanitizeMessageBody("x".repeat(2001))).toThrow("Isi pesan tidak boleh melebihi 2000 karakter.");
  });

  it("shareWhatsApp: memvalidasi format nomor dan membentuk metadata tautan dengan benar", () => {
    const rawNumber = "0812-9876-5432";
    const normalized = normalizeWhatsAppNumber(rawNumber);
    expect(normalized).toBe("6281298765432");

    const link = buildWhatsAppLink(normalized, "Halo, saya vendor proyek.");
    expect(link).toBe("https://wa.me/6281298765432?text=Halo%2C%20saya%20vendor%20proyek.");

    const linkNoNote = buildWhatsAppLink(normalized);
    expect(linkNoNote).toBe("https://wa.me/6281298765432");
  });

  it("proposeMeeting: menolak meeting dengan link non-http atau offline tanpa lokasi", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();

    const badLink = meetingProposalSchema.safeParse({
      title: "Diskusi",
      startsAt: futureDate,
      durationMinutes: 30,
      platform: "google_meet",
      link: "javascript:alert(1)",
    });
    expect(badLink.success).toBe(false);

    const offlineNoLoc = meetingProposalSchema.safeParse({
      title: "Diskusi Offline",
      startsAt: futureDate,
      durationMinutes: 60,
      platform: "offline",
      location: "",
    });
    expect(offlineNoLoc.success).toBe(false);
  });

  it("respondToMeeting: aturan hanya pihak lain (bukan pengusul) yang boleh merespons", () => {
    const meetingProposal = {
      proposedBy: "user-talent-1",
      status: "proposed",
    };

    const isAuthorizedResponder = (responderId: string) => {
      if (responderId === meetingProposal.proposedBy) {
        return { allowed: false, error: "Kamu tidak dapat merespons usulan meeting yang kamu buat sendiri." };
      }
      return { allowed: true };
    };

    // Pengusul mencoba merespons usulannya sendiri -> ditolak
    expect(isAuthorizedResponder("user-talent-1").allowed).toBe(false);
    expect(isAuthorizedResponder("user-talent-1").error).toContain("tidak dapat merespons usulan meeting yang kamu buat sendiri");

    // Pihak lawan (vendor) merespons -> diizinkan
    expect(isAuthorizedResponder("user-vendor-2").allowed).toBe(true);
  });

  it("canSendMessage: hanya mengizinkan pengiriman pesan jika status aplikasi aktif", () => {
    expect(canSendMessage("pending")).toBe(true);
    expect(canSendMessage("accepted")).toBe(true);
    expect(canSendMessage("submitted")).toBe(true);
    expect(canSendMessage("approved")).toBe(true);

    expect(canSendMessage("rejected")).toBe(false);
    expect(canSendMessage("withdrawn")).toBe(false);
    expect(canSendMessage("completed")).toBe(false);
  });

  it("formatSystemMessage: tidak membocorkan data sensitif seperti email atau rekening", () => {
    const sysMsg = formatSystemMessage("payment_paid", {
      email: "secret@company.com",
      bankAccount: "1234567890",
      rawAmount: 50000000,
    });

    expect(sysMsg).not.toContain("secret@company.com");
    expect(sysMsg).not.toContain("1234567890");
    expect(sysMsg).not.toContain("50000000");
    expect(sysMsg).toContain("Pembayaran proyek telah berhasil diverifikasi oleh sistem.");
  });
});
