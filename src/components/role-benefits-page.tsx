import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Lightbulb,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

type Role = "talent" | "vendor";

const roleContent: Record<
  Role,
  {
    label: string;
    audience: string;
    headline: string;
    description: string;
    benefits: { icon: LucideIcon; title: string; description: string }[];
  }
> = {
  talent: {
    label: "Untuk Talent",
    audience: "Mahasiswa, fresh graduate, dan profesional yang ingin bertumbuh",
    headline: "Pengalaman nyata, langkah karier yang lebih terarah.",
    description:
      "Temukan proyek yang sesuai dengan kemampuanmu, tunjukkan hasil kerjamu, dan bangun reputasi dari setiap pengalaman.",
    benefits: [
      {
        icon: SearchCheck,
        title: "Peluang yang relevan",
        description:
          "Jelajahi proyek freelance maupun volunteer yang sesuai dengan skill dan minatmu.",
      },
      {
        icon: BarChart3,
        title: "Kecocokan yang transparan",
        description:
          "Pahami alasan sebuah proyek cocok melalui skor match dan rincian skill yang dibutuhkan.",
      },
      {
        icon: Lightbulb,
        title: "Panduan skill gap",
        description:
          "Ketahui kemampuan yang sudah kuat dan skill yang bisa kamu kembangkan berikutnya.",
      },
      {
        icon: Award,
        title: "Portofolio dan reputasi",
        description:
          "Kumpulkan pengalaman, ulasan, dan rating proyek sebagai bukti perkembanganmu.",
      },
    ],
  },
  vendor: {
    label: "Untuk Vendor",
    audience: "UMKM, startup, organisasi, dan komunitas",
    headline: "Temukan talenta yang tepat untuk kebutuhan proyekmu.",
    description:
      "Publikasikan proyek dengan mudah, temukan kandidat yang relevan, lalu pilih kolaborator berdasarkan kecocokan yang jelas.",
    benefits: [
      {
        icon: Clock3,
        title: "Proses rekrutmen lebih ringkas",
        description:
          "Jelaskan kebutuhan proyek sekali dan kelola kandidat dari satu tempat.",
      },
      {
        icon: Users,
        title: "Kandidat lebih relevan",
        description:
          "Lihat talenta yang sesuai dengan kebutuhan skill dan tingkat pengalaman proyek.",
      },
      {
        icon: BarChart3,
        title: "Perbandingan yang jelas",
        description:
          "Gunakan skor kecocokan dan informasi skill untuk membantu menilai setiap pelamar.",
      },
      {
        icon: ShieldCheck,
        title: "Kolaborasi yang membangun",
        description:
          "Berikan ulasan setelah proyek selesai dan bantu membangun rekam jejak talenta.",
      },
    ],
  },
};

export function RoleBenefitsPage({ role }: { role: Role }) {
  const content = roleContent[role];
  const registerHref = `/register?role=${role}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-sky-800"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Kembali ke beranda
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-800 shadow-sm transition-colors hover:bg-sky-50"
          >
            Log in
          </Link>
        </header>

        <section className="py-16 text-center sm:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-800 shadow-sm">
              <Sparkles className="h-4 w-4" />
              {content.label}
            </span>
            <p className="mb-4 text-sm font-semibold text-slate-500">{content.audience}</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
              {content.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {content.description}
            </p>
            <Link
              href={registerHref}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition-colors hover:bg-sky-800"
            >
              Daftar sebagai {role === "talent" ? "Talent" : "Vendor"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Manfaat yang bisa kamu dapatkan
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Semua yang kamu butuhkan untuk memulai kolaborasi dengan lebih percaya diri.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.benefits.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm shadow-slate-900/5"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-3xl bg-slate-900 px-6 py-10 text-center text-white sm:px-12 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Siap memulai bersama Pathfolio?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Buat akunmu dan mulai temukan peluang atau talenta yang tepat.
            </p>
            <Link
              href={registerHref}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-sky-100"
            >
              Sign up
              <CheckCircle2 className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="pb-5 text-center text-xs text-slate-500">
          © 2026 Pathfolio — Platform AI Job &amp; Project Matchmaking.
        </footer>
      </div>
    </main>
  );
}
