import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";

const benefits = [
  {
    icon: Target,
    title: "Match yang transparan",
    description:
      "Pahami alasan sebuah proyek cocok lewat skor berdasarkan skill dan kebutuhan yang jelas.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: TrendingUp,
    title: "Bertumbuh dengan terarah",
    description:
      "Kenali skill yang sudah kuat dan kemampuan yang bisa dikembangkan selanjutnya.",
    color: "bg-violet-50 text-violet-700",
  },
  {
    icon: Award,
    title: "Bangun reputasi nyata",
    description:
      "Ubah hasil kolaborasi, rating, dan pengalaman menjadi portofolio yang bermakna.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Users,
    title: "Kolaborasi lebih tepat",
    description:
      "Bantu vendor menemukan kandidat yang relevan tanpa proses screening berulang.",
    color: "bg-emerald-50 text-emerald-700",
  },
];

const talentBenefits = [
  "Proyek freelance dan volunteer yang relevan",
  "Skor kecocokan sebelum mengirim lamaran",
  "Arahan skill gap untuk pengembangan diri",
];

const vendorBenefits = [
  "Publikasikan kebutuhan proyek dengan mudah",
  "Bandingkan kandidat lewat kecocokan skill",
  "Kelola kolaborasi dan ulasan dalam satu tempat",
];

function BenefitsList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
          <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <PublicSiteHeader />

      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_rgba(191,219,254,0.48),_transparent_45%),radial-gradient(ellipse_at_80%_40%,_rgba(221,214,254,0.38),_transparent_36%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Platform matchmaking proyek
            </div>
            <h1 className="text-[2.7rem] font-bold leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[3.75rem]">
              Temukan proyek.
              <br />
              <span className="text-blue-700">Tumbuh bersama.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Pathfolio mempertemukan talenta dan vendor lewat peluang yang relevan, kecocokan
              skill yang transparan, dan kolaborasi yang berdampak.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/talent"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Saya seorang Talent
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/vendor"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/80 px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-white"
              >
                Saya seorang Vendor
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                Peluang sesuai kemampuan
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                Match score transparan
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-blue-200/70 via-violet-100/70 to-sky-100 blur-2xl" />
            <div className="rounded-[1.75rem] border border-white bg-white p-3 shadow-[0_28px_90px_-36px_rgba(30,64,175,0.35)] sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Peluang pilihan</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Cocok untukmu</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Search className="h-4 w-4" />
                </span>
              </div>

              <article className="mt-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-sm font-bold text-white">
                      N
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">Nusantara Studio</p>
                      <p className="mt-0.5 text-xs text-slate-500">UI/UX Design · Remote</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    94% match
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
                  Redesign aplikasi mobile
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Bantu kami membuat pengalaman digital yang lebih mudah dan menyenangkan.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Figma", "UI Design", "Prototyping"].map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Durasi proyek</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">4 minggu</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                    Lihat kecocokan
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium">Kecocokan skill</span>
                  </div>
                  <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">Sangat baik</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[94%] rounded-full bg-blue-600" />
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-50/80 p-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <BriefcaseBusiness className="h-4 w-4" />
                    <span className="text-xs font-medium">Langkah berikutnya</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">Siapkan portofolio</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Tunjukkan karya relevanmu.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Relevan</p>
              <p className="mt-0.5 text-xs text-slate-500">Peluang sesuai kebutuhanmu</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Transparan</p>
              <p className="mt-0.5 text-xs text-slate-500">Pahami alasan kecocokan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Bertumbuh</p>
              <p className="mt-0.5 text-xs text-slate-500">Bangun pengalaman nyata</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Kenapa Pathfolio</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Cari peluang dengan lebih yakin.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            Bukan sekadar menemukan proyek. Dapatkan kejelasan untuk melangkah dan berkembang.
          </p>
        </div>
        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description, color }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-sm font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Mulai dari sini</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Satu platform, dua cara untuk berkembang.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
              Pilih perjalanan yang sesuai dengan tujuanmu. Kami bantu menemukan awal kolaborasi
              yang tepat.
            </p>
          </div>
          <div className="mt-11 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/15 text-blue-200">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-blue-200">Untuk Talent</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">Ubah skill jadi pengalaman.</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                Temukan proyek yang cocok, bangun portofolio, dan ketahui langkah pengembangan
                berikutnya.
              </p>
              <div className="mt-6">
                <BenefitsList items={talentBenefits} />
              </div>
              <Link
                href="/talent"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50"
              >
                Jelajahi untuk Talent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-violet-200">Untuk Vendor</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">Temukan orang yang tepat.</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                Hubungkan kebutuhan proyekmu dengan talenta yang punya skill dan semangat yang
                sesuai.
              </p>
              <div className="mt-6">
                <BenefitsList items={vendorBenefits} />
              </div>
              <Link
                href="/vendor"
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                Jelajahi untuk Vendor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-slate-950"
            aria-label="Pathfolio, beranda"
          >
            pathfolio
          </Link>
          <p className="text-xs text-slate-500">
            © 2026 Pathfolio. Connecting people with the right opportunities.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <Link href="/talent" className="transition-colors hover:text-blue-700">
              Talent
            </Link>
            <Link href="/vendor" className="transition-colors hover:text-blue-700">
              Vendor
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
