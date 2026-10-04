import { describe, it, expect } from "vitest";
import { projectSchema, projectStatusUpdateSchema } from "./project";

describe("Project Validators", () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);
  const futureDateString = futureDate.toISOString().split("T")[0];

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const pastDateString = pastDate.toISOString().split("T")[0];

  const validProjectData = {
    title: "Pembuatan Website Portofolio Interaktif",
    description: "Membutuhkan mahasiswa bertalenta untuk membuat landing page responsif dengan Next.js dan TailwindCSS.",
    difficulty: "beginner" as const,
    type: "freelance" as const,
    mode: "remote" as const,
    durationWeeks: 4,
    hoursPerWeek: 15,
    rewardAmount: 1500000,
    rewardNote: "Uang saku + Surat Referensi Kerja",
    deadline: futureDateString,
    status: "open" as const,
    skills: [
      { skillId: 1, minLevel: "beginner" as const, isRequired: true },
      { skillId: 2, minLevel: "intermediate" as const, isRequired: false },
    ],
  };

  it("menerima data proyek yang lengkap dan valid", () => {
    const parsed = projectSchema.parse(validProjectData);
    expect(parsed.title).toBe(validProjectData.title);
    expect(parsed.skills).toHaveLength(2);
    expect(parsed.status).toBe("open");
  });

  it("menolak jika judul kurang dari 5 karakter", () => {
    expect(() =>
      projectSchema.parse({
        ...validProjectData,
        title: "Web",
      })
    ).toThrow("Judul proyek minimal 5 karakter");
  });

  it("menolak jika deskripsi kurang dari 20 karakter", () => {
    expect(() =>
      projectSchema.parse({
        ...validProjectData,
        description: "Terlalu pendek",
      })
    ).toThrow("Deskripsi proyek minimal 20 karakter");
  });

  it("menolak jika reward negatif", () => {
    expect(() =>
      projectSchema.parse({
        ...validProjectData,
        rewardAmount: -50000,
      })
    ).toThrow("Nilai reward tidak boleh negatif");
  });

  it("menolak jika deadline berada di masa lalu", () => {
    expect(() =>
      projectSchema.parse({
        ...validProjectData,
        deadline: pastDateString,
      })
    ).toThrow("Deadline tidak boleh berada di masa lalu");
  });

  it("menerima proyek tanpa deadline (opsional)", () => {
    const parsed = projectSchema.parse({
      ...validProjectData,
      deadline: null,
    });
    expect(parsed.deadline).toBeNull();
  });

  it("menolak jika tidak ada skill yang dipilih (minimal 1 skill)", () => {
    expect(() =>
      projectSchema.parse({
        ...validProjectData,
        skills: [],
      })
    ).toThrow("Pilih minimal satu skill untuk proyek ini");
  });

  it("memvalidasi skema update status (open, closed, completed)", () => {
    expect(projectStatusUpdateSchema.parse({ status: "open" }).status).toBe("open");
    expect(projectStatusUpdateSchema.parse({ status: "closed" }).status).toBe("closed");
    expect(projectStatusUpdateSchema.parse({ status: "completed" }).status).toBe("completed");

    expect(() =>
      projectStatusUpdateSchema.parse({ status: "archived" as unknown })
    ).toThrow();
  });
});
