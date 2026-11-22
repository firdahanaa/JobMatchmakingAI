import React from "react";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  Brain,
  Layers,
  Info,
  HelpCircle,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MatchScoreBadge } from "./match-score-badge";
import type { TalentRecommendationScore } from "@/lib/matching/talent-e5";

interface TalentE5RecommendationPanelProps {
  recommendation: TalentRecommendationScore;
  usedCvForMatching: boolean;
}

export function TalentE5RecommendationPanel({
  recommendation,
  usedCvForMatching,
}: TalentE5RecommendationPanelProps) {
  const {
    semanticSimilarityScore,
    skillMatchingScore,
    weightedScore,
    weightsUsed,
    skillGap,
  } = recommendation;

  const w1Percent = Math.round(weightsUsed.semanticSimilarity * 100);
  const w2Percent = Math.round(weightsUsed.skillMatching * 100);
  const roundedWs = Math.round(weightedScore);

  return (
    <Card className="overflow-hidden border-sky-100 bg-white shadow-md shadow-sky-100/50">
      <CardHeader className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-blue-50/50 to-white pb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>Rekomendasi AI (E5)</span>
          </div>
          <MatchScoreBadge score={roundedWs} size="md" />
        </div>

        {/* Skor Akhir Weighted Scoring (WS) */}
        <div className="pt-2 flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0F172A]">
            {weightedScore.toFixed(1)}%
          </span>
          <span className="text-xs font-medium text-slate-500">
            Skor Gabungan (Bobot {w1Percent}:{w2Percent})
          </span>
        </div>

        {/* Indikator sumber data (Profil + CV ATS vs Profil saja) */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-sky-200/70 bg-white/80 px-2.5 py-1 text-2xs font-semibold text-sky-800 w-fit">
          <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <span>
            {usedCvForMatching
              ? "Dihitung dari Profil Talent + Teks CV ATS"
              : "Dihitung dari Profil Talent (unggah CV untuk hasil lebih lengkap)"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Rincian Komponen Skor: SS & SM */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Rincian Skor Pencocokan
          </h4>

          {/* Semantic Similarity Score (SS) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Brain className="h-3.5 w-3.5 text-sky-600" />
                <span>Semantic Similarity ({w1Percent}%)</span>
              </span>
              <span className="font-bold text-[#0F172A]">
                {semanticSimilarityScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={semanticSimilarityScore} className="h-2 bg-sky-100" />
          </div>

          {/* Skill Matching Score (SM) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span>Skill Matching ({w2Percent}%)</span>
              </span>
              <span className="font-bold text-[#0F172A]">
                {skillMatchingScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={skillMatchingScore} className="h-2 bg-sky-100" />
          </div>
        </div>

        {/* Keterampilan yang Sesuai */}
        <div className="space-y-2 border-t border-sky-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Keterampilan Sesuai ({skillGap.matchedSkills.length}/{skillGap.totalRequiredSkills})
            </span>
          </div>

          {skillGap.matchedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skillGap.matchedSkills.map((name) => (
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
            <p className="text-xs italic text-slate-500">
              Belum ada keterampilan pada profil atau CV yang cocok dengan syarat peluang ini.
            </p>
          )}
        </div>

        {/* Skill Gap: Keterampilan Belum Teridentifikasi */}
        {skillGap.unidentifiedSkills.length > 0 && (
          <div className="space-y-2 border-t border-sky-100 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              <span>
                Belum Teridentifikasi ({skillGap.unidentifiedSkills.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {skillGap.unidentifiedSkills.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200"
                >
                  <span>{name}</span>
                </span>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-2xs leading-relaxed text-slate-600 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
              <p>
                Keterampilan di atas belum teridentifikasi pada profil atau CV kamu saat ini.
                Hal ini bukan berarti kamu tidak menguasainya—tambahkan ke profil atau unggah
                CV ATS terbaru jika relevan, atau jadikan bahan pengembangan kompetensi.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
