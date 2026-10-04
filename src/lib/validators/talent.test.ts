import { describe, it, expect } from "vitest";
import {
  portfolioUrlSchema,
  talentProfileUpdateSchema,
  talentSkillsUpdateSchema,
} from "./talent";

describe("Talent Validators", () => {
  describe("portfolioUrlSchema", () => {
    it("menerima URL yang valid dengan http atau https", () => {
      expect(portfolioUrlSchema.parse("https://github.com/developer")).toBe("https://github.com/developer");
      expect(portfolioUrlSchema.parse("http://myportfolio.dev")).toBe("http://myportfolio.dev");
    });

    it("menolak URL yang tidak valid atau tanpa protokol", () => {
      expect(() => portfolioUrlSchema.parse("bukan-url")).toThrow();
      expect(() => portfolioUrlSchema.parse("github.com/developer")).toThrow();
    });
  });

  describe("talentProfileUpdateSchema", () => {
    const validData = {
      headline: "Frontend Engineer (React / Next.js)",
      bio: "Mahasiswa tingkat akhir dengan minat di web development.",
      education: "S1 Teknik Informatika - ITB",
      location: "Bandung",
      hoursPerWeek: 20,
      preferredMode: "remote" as const,
      isAvailable: true,
      portfolioUrls: ["https://github.com/user", "https://behance.net/user"],
    };

    it("memvalidasi data profil lengkap yang benar", () => {
      const parsed = talentProfileUpdateSchema.parse(validData);
      expect(parsed.headline).toBe(validData.headline);
      expect(parsed.hoursPerWeek).toBe(20);
      expect(parsed.preferredMode).toBe("remote");
      expect(parsed.portfolioUrls).toHaveLength(2);
    });

    it("menolak jika headline kurang dari 3 karakter", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          headline: "Hi",
        })
      ).toThrow("Headline minimal 3 karakter");
    });

    it("menolak jika pendidikan kurang dari 2 karakter", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          education: "A",
        })
      ).toThrow("Pendidikan minimal 2 karakter");
    });

    it("menolak jika lokasi kurang dari 2 karakter", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          location: "B",
        })
      ).toThrow("Lokasi domisili minimal 2 karakter");
    });

    it("menolak jam per minggu di luar rentang 0-80", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          hoursPerWeek: -5,
        })
      ).toThrow();

      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          hoursPerWeek: 90,
        })
      ).toThrow();
    });

    it("menolak mode kerja yang tidak terdaftar", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          preferredMode: "anywhere" as unknown,
        })
      ).toThrow();
    });

    it("menolak jika salah satu URL portofolio tidak valid", () => {
      expect(() =>
        talentProfileUpdateSchema.parse({
          ...validData,
          portfolioUrls: ["https://github.com", "link-rusak"],
        })
      ).toThrow();
    });
  });

  describe("talentSkillsUpdateSchema", () => {
    it("menerima daftar keahlian dengan level valid", () => {
      const validSkills = {
        skills: [
          { skillId: 1, level: "beginner" as const },
          { skillId: 5, level: "intermediate" as const },
          { skillId: 10, level: "advanced" as const },
        ],
      };

      const parsed = talentSkillsUpdateSchema.parse(validSkills);
      expect(parsed.skills).toHaveLength(3);
      expect(parsed.skills[0].level).toBe("beginner");
      expect(parsed.skills[2].level).toBe("advanced");
    });

    it("menolak jika level keahlian tidak valid", () => {
      expect(() =>
        talentSkillsUpdateSchema.parse({
          skills: [
            {
              skillId: 1,
              level: "expert" as unknown,
            },
          ],
        })
      ).toThrow();
    });

    it("menolak jika ID skill bukan integer positif", () => {
      expect(() =>
        talentSkillsUpdateSchema.parse({
          skills: [{ skillId: -1, level: "beginner" }],
        })
      ).toThrow();
    });
  });
});
