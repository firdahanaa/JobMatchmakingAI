import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Layers3, Sparkles, Target } from "lucide-react";

interface AuthLayoutProps {
  heading: string;
  description: string;
  children: ReactNode;
}

export function AuthLayout({ heading, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative isolate flex min-h-[280px] flex-col justify-between overflow-hidden rounded-b-[2rem] bg-slate-950 px-6 py-6 text-white sm:px-10 sm:py-8 lg:sticky lg:top-0 lg:h-screen lg:rounded-none lg:px-14 lg:py-12">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_5%,_rgba(59,130,246,0.45),_transparent_42%),radial-gradient(ellipse_at_90%_88%,_rgba(37,99,235,0.32),_transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="pointer-events-none absolute -bottom-36 -right-28 -z-10 h-96 w-96 rounded-full border border-blue-200/20" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 -z-10 h-72 w-72 rounded-full border border-blue-200/20" />

          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2.5 text-lg font-extrabold tracking-tight"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Layers3 className="h-5 w-5" />
            </span>
            pathfolio
          </Link>

          <div className="relative mt-10 max-w-xl lg:mt-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Peluang yang relevan, langkah yang jelas
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Temukan kecocokan.
              <br />
              Bangun pengalaman.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Terhubung lewat skill, tumbuh lewat kolaborasi, dan buat setiap proyek jadi bagian
              dari perjalananmu.
            </p>

            <div className="mt-7 hidden max-w-md rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur sm:block">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/15 text-blue-200">
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-300">Kecocokan proyek</p>
                    <p className="mt-0.5 text-sm font-bold">Dijelaskan dengan transparan</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-blue-200" />
              </div>
            </div>
          </div>

          <p className="mt-8 hidden text-xs text-slate-400 lg:block">
            © 2026 Pathfolio — Connecting people with the right opportunities.
          </p>
        </aside>

        <section className="flex min-h-[calc(100vh-17.5rem)] items-center justify-center px-4 py-10 sm:px-8 lg:min-h-screen lg:px-12 xl:px-20">
          <div className="w-full max-w-lg">
            <header className="mb-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Selamat datang di Pathfolio
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {heading}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
