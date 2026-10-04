import React from "react";
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Clock,
  Star,
  Award,
  BookOpen,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MatchScoreBadge } from "./match-score-badge";
import type { MatchResult } from "@/lib/matching/types";

interface MatchBreakdownPanelProps {
  matchResult: MatchResult;
  hasConfiguredSkills?: boolean;
}

export function MatchBreakdownPanel({
  matchResult,
}: MatchBreakdownPanelProps) {
  const { score, breakdown, matchedSkills, missingSkills, underLevelSkills, explanation } =
    matchResult;

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100/70 text-purple-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>Kecocokanmu</span>
          </div>
          <MatchScoreBadge score={score} size="md" />
        </div>

        {/* Big Score Display */}
        <div className="pt-2 flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            {score}%
          </span>
          <span className="text-xs font-medium text-slate-500">
            Kecocokan Profil & Kebutuhan
          </span>
        </div>

        {/* Constructive Explanation Sentence */}
        <div className="mt-3 p-3 rounded-xl bg-white border border-purple-100/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="font-medium text-slate-800">{explanation}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Component 1: 4 Breakdown Metrics with Progress Bars */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Rincian Komponen Skor
          </h4>

          {/* Skill Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <Award className="h-3.5 w-3.5 text-purple-600" />
                <span>Kepemilikan Keahlian (50%)</span>
              </span>
              <span className="font-bold text-slate-900">{breakdown.skill}%</span>
            </div>
            <Progress value={breakdown.skill} className="h-2 bg-slate-100" />
          </div>

          {/* Level Fit Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                <span>Kesesuaian Level (20%)</span>
              </span>
              <span className="font-bold text-slate-900">{breakdown.levelFit}%</span>
            </div>
            <Progress value={breakdown.levelFit} className="h-2 bg-slate-100" />
          </div>

          {/* Availability Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>Ketersediaan Waktu & Mode (15%)</span>
              </span>
              <span className="font-bold text-slate-900">{breakdown.availability}%</span>
            </div>
            <Progress value={breakdown.availability} className="h-2 bg-slate-100" />
          </div>

          {/* Rating Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>Rekam Jejak & Ulasan (15%)</span>
              </span>
              <span className="font-bold text-slate-900">{breakdown.rating}%</span>
            </div>
            <Progress value={breakdown.rating} className="h-2 bg-slate-100" />
            {breakdown.rating === 60 && (
              <span className="text-3xs text-slate-400 block pt-0.5">
                *Skor awal netral 60% diterapkan untuk profil talenta baru.
              </span>
            )}
          </div>
        </div>

        {/* Component 2: Matched Skills */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Keahlian Cocok ({matchedSkills.length})</span>
          </div>

          {matchedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[2.5]" />
                  <span>{name}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Belum ada keahlian yang sepenuhnya cocok dengan level proyek ini.
            </p>
          )}
        </div>

        {/* Component 3: Under-Level Skills */}
        {underLevelSkills.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span>Perlu Peningkatan Level ({underLevelSkills.length})</span>
            </div>
            <p className="text-2xs text-slate-500">
              Kamu sudah memiliki dasar skill ini, asah sedikit lagi untuk mencapai level standar:
            </p>
            <div className="space-y-1.5">
              {underLevelSkills.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs"
                >
                  <span className="font-semibold text-amber-950">{item.name}</span>
                  <div className="flex items-center gap-1.5 text-2xs font-medium">
                    <span className="text-slate-600 capitalize bg-white px-2 py-0.5 rounded border border-amber-200">
                      Kamu: {item.has}
                    </span>
                    <span className="text-amber-600">→</span>
                    <span className="text-amber-800 font-bold capitalize bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      Butuh: {item.needs}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Component 4: Missing Skills */}
        {missingSkills.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <span>Keahlian Belum Dimiliki ({missingSkills.length})</span>
            </div>
            <p className="text-2xs text-slate-500">
              Pertimbangkan untuk mempelajari keahlian ini guna meningkatkan peluangmu:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <span>{name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Encouraging Coaching Callout */}
        <div className="rounded-xl bg-purple-50/80 border border-purple-100 p-3.5 text-xs text-purple-900 space-y-1">
          <div className="font-semibold flex items-center gap-1 text-purple-950">
            <span>💡 Tips Pengembanan Portofolio</span>
          </div>
          <p className="text-2xs text-purple-800 leading-relaxed">
            Skor kecocokan ini dihitung secara transparan untuk membantumu menemukan proyek terbaik
            dan mengetahui kompetensi baru yang dapat kamu pelajari.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
