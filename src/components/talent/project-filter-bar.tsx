"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, RotateCcw, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProjectFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") || "";
  const currentDifficulty = searchParams.get("difficulty") || "all";
  const currentType = searchParams.get("type") || "all";
  const currentMode = searchParams.get("mode") || "all";
  const currentSort = searchParams.get("sort") || "match";

  const [searchText, setSearchText] = useState(currentQ);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value.trim() !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchText);
  };

  const handleReset = () => {
    setSearchText("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const isFiltered =
    currentQ !== "" ||
    currentDifficulty !== "all" ||
    currentType !== "all" ||
    currentMode !== "all" ||
    currentSort !== "match";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Row: Search Input & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari berdasarkan judul proyek atau keahlian (contoh: React, Figma)..."
            className="pl-9.5 pr-20 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10 rounded-xl"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-semibold text-purple-700 hover:text-purple-800 hover:bg-purple-50"
          >
            Cari
          </Button>
        </form>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap pl-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span>Urutkan:</span>
          </div>
          <select
            value={currentSort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="match">Match Score Tertinggi (AI)</option>
            <option value="newest">Proyek Terbaru</option>
            <option value="deadline">Batas Waktu Terdekat</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Filters (Difficulty, Type, Mode, Reset) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium mr-1 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          {/* Difficulty Filter */}
          <select
            value={currentDifficulty}
            onChange={(e) => updateParam("difficulty", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">Semua Tingkat Kesulitan</option>
            <option value="beginner">Pemula (Beginner)</option>
            <option value="intermediate">Menengah (Intermediate)</option>
            <option value="advanced">Tingkat Lanjut (Advanced)</option>
          </select>

          {/* Type Filter */}
          <select
            value={currentType}
            onChange={(e) => updateParam("type", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">Semua Tipe Proyek</option>
            <option value="freelance">Freelance (Berbayar)</option>
            <option value="volunteer">Volunteer (Sukarela)</option>
          </select>

          {/* Mode Filter */}
          <select
            value={currentMode}
            onChange={(e) => updateParam("mode", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">Semua Mode Kerja</option>
            <option value="remote">Remote (Online)</option>
            <option value="onsite">Onsite (Di Lokasi)</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </Button>
        )}
      </div>
    </div>
  );
}
