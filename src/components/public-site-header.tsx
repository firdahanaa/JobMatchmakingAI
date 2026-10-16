import Link from "next/link";
import { Layers3 } from "lucide-react";

type PublicRole = "talent" | "vendor" | null;

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Pathfolio, beranda"
      className="inline-flex items-center gap-2.5"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
        <Layers3 className="h-[18px] w-[18px]" />
      </span>
      <span className="hidden text-lg font-extrabold tracking-tight text-slate-950 sm:inline">
        pathfolio
      </span>
    </Link>
  );
}

export function PublicSiteHeader({ activeRole = null }: { activeRole?: PublicRole }) {
  const roleLinkClass = (role: Exclude<PublicRole, null>) =>
    `whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-semibold transition-colors sm:px-5 sm:text-sm ${
      activeRole === role
        ? "bg-white text-slate-950 shadow-sm"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
    }`;

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto grid h-[76px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Jenis akun"
          className="col-start-2 flex items-center gap-1 rounded-full bg-slate-100 p-1"
        >
          <Link href="/talent" className={roleLinkClass("talent")}>
            Talent
          </Link>
          <Link href="/vendor" className={roleLinkClass("vendor")}>
            Vendor
          </Link>
        </nav>

        <div className="col-start-3 flex items-center justify-self-end gap-1 sm:gap-2">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full px-2 py-2 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:px-4 sm:text-sm"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="whitespace-nowrap rounded-full bg-slate-950 px-2.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 sm:px-5 sm:text-sm"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
