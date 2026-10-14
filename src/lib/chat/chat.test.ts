import { describe, expect, it } from "vitest";
import {
  canSendMessage,
  getChatNotice,
  normalizeWhatsAppNumber,
  buildWhatsAppLink,
  meetingProposalSchema,
  buildIcs,
  sanitizeMessageBody,
  linkify,
  formatSystemMessage,
  resolveOtherPartyName,
  type SystemMessageEvent,
} from "./index";
import type { ApplicationStatus } from "@/types/database";

describe("Chat Permissions: canSendMessage() & getChatNotice()", () => {
  it("canSendMessage mengizinkan status aktif dan menolak status terminal", () => {
    const activeStatuses: ApplicationStatus[] = ["pending", "accepted", "submitted", "approved"];
    const terminalStatuses: ApplicationStatus[] = ["rejected", "withdrawn", "completed"];

    for (const status of activeStatuses) {
      expect(canSendMessage(status)).toBe(true);
      expect(getChatNotice(status)).toBeNull();
    }

    for (const status of terminalStatuses) {
      expect(canSendMessage(status)).toBe(false);
      const notice = getChatNotice(status);
      expect(notice).toBeTruthy();
      expect(typeof notice).toBe("string");
    }
  });
});

describe("Chat Contact: normalizeWhatsAppNumber() & buildWhatsAppLink()", () => {
  it("menerima berbagai format nomor WhatsApp Indonesia dan menormalisasi ke 628xx", () => {
    expect(normalizeWhatsAppNumber("08123456789")).toBe("628123456789");
    expect(normalizeWhatsAppNumber("+628123456789")).toBe("628123456789");
    expect(normalizeWhatsAppNumber("628123456789")).toBe("628123456789");
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("  (0812) 3456-7890  ")).toBe("6281234567890");
  });

  it("menolak nomor tidak valid, kosong, panjang di luar 10-15 digit, atau karakter non-numerik", () => {
    expect(() => normalizeWhatsAppNumber("")).toThrow();
    expect(() => normalizeWhatsAppNumber("   ")).toThrow();
    expect(() => normalizeWhatsAppNumber("0812abc3456")).toThrow();
    expect(() => normalizeWhatsAppNumber("081234")).toThrow(); // terlalu pendek (<10 digit)
    expect(() => normalizeWhatsAppNumber("08123456789012345")).toThrow(); // terlalu panjang (>15 digit)
    expect(() => normalizeWhatsAppNumber("14155552671")).toThrow(); // bukan kode 62/08
  });

  it("buildWhatsAppLink menghasilkan URL wa.me dengan atau tanpa pesan awal", () => {
    expect(buildWhatsAppLink("08123456789")).toBe("https://wa.me/628123456789");
    expect(buildWhatsAppLink("08123456789", "Halo, saya dari JobMatchmaking")).toBe(
      "https://wa.me/628123456789?text=Halo%2C%20saya%20dari%20JobMatchmaking"
    );
  });
});

describe("Chat Meeting: meetingProposalSchema & buildIcs()", () => {
  const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  it("menerima usulan meeting online yang valid", () => {
    const validData = {
      title: "Kickoff Diskusi Proyek",
      startsAt: futureIso,
      durationMinutes: 45,
      platform: "google_meet" as const,
      link: "https://meet.google.com/abc-defg-hij",
      note: "Diskusi kebutuhan spesifikasi teknis",
    };

    const parsed = meetingProposalSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("menolak meeting di masa lalu", () => {
    const pastMeeting = {
      title: "Diskusi Masa Lalu",
      startsAt: pastIso,
      durationMinutes: 30,
      platform: "zoom" as const,
    };

    const parsed = meetingProposalSchema.safeParse(pastMeeting);
    expect(parsed.success).toBe(false);
  });

  it("menolak meeting offline tanpa lokasi", () => {
    const offlineWithoutLocation = {
      title: "Diskusi Tatap Muka",
      startsAt: futureIso,
      durationMinutes: 60,
      platform: "offline" as const,
      location: "   ",
    };

    const parsed = meetingProposalSchema.safeParse(offlineWithoutLocation);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("location"))).toBe(true);
    }
  });

  it("menerima meeting offline jika lokasi terisi", () => {
    const offlineWithLocation = {
      title: "Diskusi Tatap Muka Kantor",
      startsAt: futureIso,
      durationMinutes: 60,
      platform: "offline" as const,
      location: "Gedung Cyber 2 Lantai 15, Jakarta",
    };

    const parsed = meetingProposalSchema.safeParse(offlineWithLocation);
    expect(parsed.success).toBe(true);
  });

  it("menolak durasi kurang dari 15 menit atau lebih dari 240 menit", () => {
    expect(
      meetingProposalSchema.safeParse({
        title: "Quick Chat",
        startsAt: futureIso,
        durationMinutes: 10,
        platform: "zoom",
      }).success
    ).toBe(false);

    expect(
      meetingProposalSchema.safeParse({
        title: "Marathon Chat",
        startsAt: futureIso,
        durationMinutes: 300,
        platform: "zoom",
      }).success
    ).toBe(false);
  });

  it("buildIcs menghasilkan string iCalendar dengan DTSTART, DTEND, SUMMARY valid", () => {
    const ics = buildIcs(
      {
        title: "Review Sprint 1",
        startsAt: futureIso,
        durationMinutes: 60,
        platform: "google_meet",
        link: "https://meet.google.com/xyz",
        note: "Bahas pengerjaan modul autentikasi",
      },
      "Budi Vendor"
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:");
    expect(ics).toContain("DTEND:");
    expect(ics).toContain("SUMMARY:Review Sprint 1");
    expect(ics).toContain("ORGANIZER;CN=\"Budi Vendor\"");
  });
});

describe("Chat Messages: sanitizeMessageBody(), linkify(), formatSystemMessage()", () => {
  it("sanitizeMessageBody memotong whitespace dan menolak pesan kosong atau melebihi 2000 karakter", () => {
    expect(sanitizeMessageBody("  Halo apa kabar?  ")).toBe("Halo apa kabar?");
    expect(() => sanitizeMessageBody("")).toThrow();
    expect(() => sanitizeMessageBody("     ")).toThrow();

    const longMessage = "a".repeat(2001);
    expect(() => sanitizeMessageBody(longMessage)).toThrow();

    const valid2000 = "a".repeat(2000);
    expect(sanitizeMessageBody(valid2000)).toHaveLength(2000);
  });

  it("linkify memecah http/https menjadi tautan aman dan menolak javascript: serta data: URL", () => {
    const input = "Kunjungi https://example.com dan http://api.org/test untuk dokumentasi.";
    const segments = linkify(input);

    const links = segments.filter((s) => s.type === "link");
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      type: "link",
      href: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    });

    // Uji proteksi keamanan XSS: javascript: dan data: URL harus tetap sebagai teks murni
    const maliciousInput = "Klik javascript:alert(1) atau buka data:text/html;base64,PHNjcmlwdD4= sekarang!";
    const maliciousSegments = linkify(maliciousInput);

    const maliciousLinks = maliciousSegments.filter((s) => s.type === "link");
    expect(maliciousLinks).toHaveLength(0); // tidak ada yang dijadikan link
    expect(maliciousSegments.some((s) => s.content.includes("javascript:alert(1)"))).toBe(true);
  });

  it("formatSystemMessage menghasilkan pesan sistem standar untuk 9 jenis event", () => {
    const events: SystemMessageEvent[] = [
      "application_created",
      "application_accepted",
      "application_rejected",
      "work_submitted",
      "revision_requested",
      "work_approved",
      "payment_awaiting",
      "payment_paid",
      "application_completed",
    ];

    for (const event of events) {
      const msg = formatSystemMessage(event, {
        projectTitle: "Platform AI",
        revisionNotes: "Perbaiki tata letak responsif",
      });
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(10);
    }

    // Uji pesan revisi memuat catatan revisi
    const revisionMsg = formatSystemMessage("revision_requested", {
      revisionNotes: "Ganti warna tombol menjadi biru",
    });
    expect(revisionMsg).toContain("Ganti warna tombol menjadi biru");
  });
});

describe("Chat Name Resolution: resolveOtherPartyName()", () => {
  it("menampilkan nama asli pelamar saat vendor melihat percakapan", () => {
    const res = resolveOtherPartyName({
      isMeTalent: false,
      directProfileName: "Aditya Pratama",
      embeddedProfileName: "Aditya P",
    });
    expect(res).toBe("Aditya Pratama");
  });

  it("menggunakan embedded profile jika direct profile kosong", () => {
    const res = resolveOtherPartyName({
      isMeTalent: false,
      directProfileName: "",
      embeddedProfileName: "Nadia Putri Rahmawati",
    });
    expect(res).toBe("Nadia Putri Rahmawati");
  });

  it("menolak placeholder 'Talenta'/'talent' dan mengekstrak nama dari email kontak lamaran", () => {
    const res = resolveOtherPartyName({
      isMeTalent: false,
      directProfileName: "Talenta",
      embeddedProfileName: "talent",
      applicationMessage: "Halo saya tertarik melamar proyek ini.\n\n[Kontak: firman.nugraha@gmail.com]",
    });
    expect(res).toBe("Firman Nugraha");
  });

  it("memberikan fallback 'Pelamar Proyek' jika nama dan kontak sama sekali tidak tersedia", () => {
    const res = resolveOtherPartyName({
      isMeTalent: false,
      directProfileName: "Talenta",
      embeddedProfileName: null,
      applicationMessage: "Pesan tanpa kontak",
    });
    expect(res).toBe("Pelamar Proyek");
  });

  it("menampilkan nama organisasi vendor saat talent melihat percakapan", () => {
    const res = resolveOtherPartyName({
      isMeTalent: true,
      vendorOrgName: "PT Teknologi Nusantara",
      directProfileName: "Admin Vendor",
    });
    expect(res).toBe("PT Teknologi Nusantara");
  });
});
