import Link from "next/link";
import { CircleHelp } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-sky-100 bg-white/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Pathfolio · Menghubungkan talent dengan project yang bermakna.</span>
        <Link href="/help" className="inline-flex min-h-9 items-center gap-2 font-semibold text-sky-800 hover:text-sky-600">
          <CircleHelp className="h-4 w-4" />
          Bantuan · Laporkan Kendala
        </Link>
      </div>
    </footer>
  );
}
