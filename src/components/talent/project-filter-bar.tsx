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
    <div
      className="rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl transition-all"
      style={{
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(186, 230, 253, 0.7)",
        boxShadow: "0 20px 40px -15px rgba(2, 136, 209, 0.08)",
      }}
    >
      {/* Top Row: Search Input & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
          <Input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari proyek atau keahlian (contoh: React, Figma, Python)..."
            className="pl-10 pr-24 text-[#0F172A] placeholder:text-slate-400 text-sm h-12 rounded-2xl font-medium transition-all"
            style={{
              background: "rgba(240, 249, 255, 0.8)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:from-[#0369A1] hover:to-[#1D4ED8] text-white rounded-xl shadow-md shadow-sky-500/20"
          >
            Cari
          </Button>
        </form>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-extrabold whitespace-nowrap pl-1 uppercase tracking-wider">
            <ArrowUpDown className="h-3.5 w-3.5 text-sky-500" />
            <span>Urutkan:</span>
          </div>
          <select
            value={currentSort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="h-12 rounded-2xl text-[#0F172A] px-3.5 text-xs sm:text-sm font-bold focus:outline-none cursor-pointer transition-all"
            style={{
              background: "rgba(240, 249, 255, 0.8)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
            }}
          >
            <option value="match">Match Score (AI)</option>
            <option value="newest">Proyek Terbaru</option>
            <option value="deadline">Batas Waktu Terdekat</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sky-100/80">
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-slate-400 font-extrabold mr-1 text-[11px] uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5 text-sky-500" />
            <span>Filter:</span>
          </div>

          {/* Difficulty Filter */}
          <select
            value={currentDifficulty}
            onChange={(e) => updateParam("difficulty", e.target.value)}
            className="h-9 rounded-xl text-[#0F172A] px-3 text-xs font-semibold focus:outline-none cursor-pointer transition-all"
            style={{
              background: "rgba(240, 249, 255, 0.8)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
            }}
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
            className="h-9 rounded-xl text-[#0F172A] px-3 text-xs font-semibold focus:outline-none cursor-pointer transition-all"
            style={{
              background: "rgba(240, 249, 255, 0.8)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
            }}
          >
            <option value="all">Semua Tipe Proyek</option>
            <option value="freelance">Freelance (Berbayar)</option>
            <option value="volunteer">Volunteer (Sukarela)</option>
          </select>

          {/* Mode Filter */}
          <select
            value={currentMode}
            onChange={(e) => updateParam("mode", e.target.value)}
            className="h-9 rounded-xl text-[#0F172A] px-3 text-xs font-semibold focus:outline-none cursor-pointer transition-all"
            style={{
              background: "rgba(240, 249, 255, 0.8)",
              border: "1px solid rgba(186, 230, 253, 0.8)",
            }}
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
            className="h-9 px-3 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50/80 gap-1.5 font-bold rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </Button>
        )}
      </div>
    </div>
  );
}
