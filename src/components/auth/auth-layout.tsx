import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
  heading: string;
  description: string;
  children: ReactNode;
}

function AuthLandscape() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 900 1200"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#e9dafa" />
          <stop offset=".48" stopColor="#ffd8ba" />
          <stop offset="1" stopColor="#c6e7ed" />
        </linearGradient>
        <linearGradient id="auth-meadow" x1="0" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor="#a7c87a" />
          <stop offset="1" stopColor="#344e66" />
        </linearGradient>
        <linearGradient id="auth-mountain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f1ff" />
          <stop offset="1" stopColor="#9da9d0" />
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#auth-sky)" />
      <circle cx="155" cy="235" r="92" fill="#fff3d8" opacity=".6" />
      <path d="M0 610 130 492l91 79 167-253 181 237 102-118 229 191v230H0Z" fill="#aab1d3" />
      <path d="m262 494 126-176 58 76-43-15-27 28-25-13-32 54-19-8-21 34-17-4Z" fill="#faf7ff" />
      <path d="m0 634 143-110 101 74 133-171 152 177 93-95 278 149v144H0Z" fill="url(#auth-mountain)" opacity=".9" />
      <path d="M0 748q183-105 359-15t541-20v487H0Z" fill="#8da969" />
      <path d="M0 842q217-160 420-42t480-22v422H0Z" fill="#a5bd70" />
      <path d="M0 967q230-166 461-20t439-42v295H0Z" fill="url(#auth-meadow)" />
      <path d="M0 1093q256-174 475-30t425-20v157H0Z" fill="#435b68" opacity=".72" />
      <g fill="#314c4d" opacity=".9">
        <path d="m42 720 35-105 35 105H96v77H58v-77Zm83 12 28-87 29 87h-19v64h-29v-64Zm-120 22 25-78 26 78H39v61H16v-61Z" />
        <path d="m719 700 34-104 34 104h-22v78h-38v-78Zm77 24 26-81 27 81h-18v59h-35v-59Z" />
      </g>
      <g fill="#f7e39a" opacity=".95">
        <circle cx="125" cy="930" r="7" /><circle cx="205" cy="1010" r="6" /><circle cx="310" cy="916" r="8" />
        <circle cx="413" cy="1047" r="7" /><circle cx="535" cy="942" r="6" /><circle cx="638" cy="1060" r="8" />
        <circle cx="754" cy="932" r="7" /><circle cx="845" cy="1012" r="6" />
      </g>
      <g fill="#f4f0ff">
        <circle cx="166" cy="1070" r="8" /><circle cx="166" cy="1057" r="5" /><circle cx="179" cy="1070" r="5" /><circle cx="153" cy="1070" r="5" /><circle cx="166" cy="1083" r="5" />
        <circle cx="368" cy="1128" r="8" /><circle cx="368" cy="1115" r="5" /><circle cx="381" cy="1128" r="5" /><circle cx="355" cy="1128" r="5" /><circle cx="368" cy="1141" r="5" />
        <circle cx="709" cy="1103" r="8" /><circle cx="709" cy="1090" r="5" /><circle cx="722" cy="1103" r="5" /><circle cx="696" cy="1103" r="5" /><circle cx="709" cy="1116" r="5" />
      </g>
      <g fill="#ed9d86">
        <circle cx="266" cy="1090" r="7" /><circle cx="266" cy="1078" r="4" /><circle cx="278" cy="1090" r="4" /><circle cx="254" cy="1090" r="4" /><circle cx="266" cy="1102" r="4" />
        <circle cx="567" cy="1138" r="7" /><circle cx="567" cy="1126" r="4" /><circle cx="579" cy="1138" r="4" /><circle cx="555" cy="1138" r="4" /><circle cx="567" cy="1150" r="4" />
        <circle cx="813" cy="1055" r="7" /><circle cx="813" cy="1043" r="4" /><circle cx="825" cy="1055" r="4" /><circle cx="801" cy="1055" r="4" /><circle cx="813" cy="1067" r="4" />
      </g>
    </svg>
  );
}

export function AuthLayout({ heading, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#c9dce7]">
      <div className="grid min-h-screen lg:grid-cols-[46%_54%]">
        <aside
          className="relative h-48 overflow-hidden sm:h-64 lg:sticky lg:top-0 lg:h-screen"
          style={{ borderRadius: "0 18% 20% 0 / 0 50% 50% 0" }}
        >
          <AuthLandscape />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/55 to-transparent px-6 pb-5 pt-16 sm:px-10 sm:pb-8 lg:px-12 lg:pb-12">
            <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-black tracking-tight text-white drop-shadow">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/40 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </span>
              Pathfolio
            </Link>
            <p className="mt-3 hidden max-w-sm text-sm leading-relaxed text-white/90 drop-shadow sm:block">
              Temukan proyek yang tepat, bangun pengalaman, dan kembangkan perjalanan kariermu.
            </p>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-5 py-9 sm:px-8 lg:min-h-screen lg:px-12 lg:py-12">
          <div className="w-full max-w-xl">
            <header className="mb-7">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-sky-700">
                  <Sparkles className="h-4 w-4" />
                </span>
                Pathfolio
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{heading}</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{description}</p>
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
