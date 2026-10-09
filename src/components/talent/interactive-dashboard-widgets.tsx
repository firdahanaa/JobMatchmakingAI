"use client";

import React, { useState } from "react";
import { Sparkles, Radar, Flame, SlidersHorizontal, Search, CheckCircle2, ArrowUpRight, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveDashboardProps {
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Animated Live AI Activity Ticker
 */
export function AILiveTicker() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e0c4bc]/70 bg-gradient-to-r from-[#F7ECEA] via-[#F9F5DC] to-[#F7ECEA] p-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C98B75] to-[#D4B980] text-white shadow-xs">
          <Radar className="h-4 w-4 animate-radar" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-gradient-flow text-xs font-bold text-[#4a3728] whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#C98B75]" />
              <span className="text-[#b87a65]">AI Match Engine:</span> 1,240 Proyek Di-scan Realtime
            </span>
            <span className="text-[#d4b0a5]">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[#9c824a]">Match Score Puncak:</span> 95% Cocok untuk Profilmu
            </span>
            <span className="text-[#d4b0a5]">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              3 Vendor Terverifikasi Meninjau Talenta Minggu Ini
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-3xs font-extrabold text-[#b87a65] border border-[#e8d5d0] shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          LIVE AI RADAR
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Filter Tabs and Search Bar for Recommended Projects
 */
export function ProjectFilterBar({
  activeFilter = "all",
  onFilterChange,
  searchQuery = "",
  onSearchChange,
}: {
  activeFilter: string;
  onFilterChange: (f: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filters = [
    { id: "all", label: "Semua Proyek", icon: Sparkles },
    { id: "high_match", label: "Match > 80%", icon: Target },
    { id: "remote", label: "Remote Only", icon: Zap },
    { id: "freelance", label: "Paid Freelance", icon: Flame },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/90 p-3 sm:p-4 rounded-3xl border border-[#e8d5d0] shadow-sm backdrop-blur-xl">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all duration-300 select-none",
                isActive
                  ? "bg-gradient-to-r from-[#C98B75] to-[#D4B980] text-white shadow-md shadow-[#C98B75]/20 scale-105"
                  : "bg-[#F7ECEA]/60 text-[#7a6559] hover:bg-[#F7ECEA] hover:text-[#4a3728] border border-[#e8d5d0]/80"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#C98B75]")} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E0E081] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E0E081]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Search */}
      <div className="relative min-w-[200px] sm:min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a89080]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari judul skill/vendor..."
          className="w-full rounded-2xl border border-[#e8d5d0] bg-[#F7ECEA]/50 pl-9 pr-3 py-1.5 text-xs text-[#4a3728] placeholder-[#a89080] focus:border-[#C98B75] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98B75]/20 transition-all"
        />
      </div>
    </div>
  );
}

/**
 * Skill Orbit Interactive Visual Card
 */
export function SkillOrbitWidget({ skillsCount = 5 }: { skillsCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#e8d5d0] bg-gradient-to-br from-white via-[#F9F5DC]/40 to-[#F7ECEA] p-6 shadow-sm group">
      {/* Decorative Orbs */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#C98B75]/20 via-[#D4B980]/20 to-transparent blur-2xl animate-pulse-glow" />
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F7ECEA] px-2.5 py-0.5 text-3xs font-extrabold text-[#b87a65]">
            <Sparkles className="h-3 w-3" />
            AI SKILL ORBIT
          </span>
          <h4 className="text-base font-extrabold text-[#4a3728]">Matrix Keahlian Talenta</h4>
          <p className="text-xs text-[#8a7668]">
            {skillsCount} Skill terverifikasi terhubung dengan pencocokan otomatis AI
          </p>
        </div>

        {/* Animated Radar Visual Circle */}
        <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#C98B75]/40 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-[#D4B980]/50" />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#C98B75] to-[#D4B980] flex items-center justify-center text-white shadow-md">
            <Zap className="h-4 w-4" />
          </div>
          {/* Orbiting particle */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="h-2.5 w-2.5 rounded-full bg-[#E0E081] shadow-xs border border-white -top-1 left-1/2 -translate-x-1/2 absolute" />
          </div>
        </div>
      </div>
    </div>
  );
}
