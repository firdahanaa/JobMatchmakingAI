import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Coins,
  MapPin,
  Check,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MatchScoreBadge } from "./match-score-badge";
import type { ProjectWithMatch } from "@/app/talent/projects/actions";

interface ProjectCardProps {
  project: ProjectWithMatch;
}

const difficultyLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }> = {
  beginner: { label: "Pemula", variant: "secondary" },
  intermediate: { label: "Menengah", variant: "warning" },
  advanced: { label: "Tingkat Lanjut", variant: "default" },
};

const typeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" }> = {
  freelance: { label: "Freelance", variant: "default" },
  volunteer: { label: "Volunteer", variant: "outline" },
};

const modeLabels: Record<string, { label: string; icon: string }> = {
  remote: { label: "Remote", icon: "🌐" },
  onsite: { label: "Onsite", icon: "🏢" },
  hybrid: { label: "Hybrid", icon: "🔄" },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const diffInfo = difficultyLabels[project.difficulty] || {
    label: project.difficulty,
    variant: "secondary" as const,
  };
  const typeInfo = typeLabels[project.type] || {
    label: project.type,
    variant: "default" as const,
  };
  const modeInfo = modeLabels[project.mode] || {
    label: project.mode,
    icon: "📌",
  };

  const formattedReward =
    project.rewardAmount && project.rewardAmount > 0
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(project.rewardAmount)
      : project.type === "volunteer"
      ? "Sukarela (Volunteer)"
      : "Sesuai Kesepakatan";

  const formattedDeadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Fleksibel";

  const daysLeft = project.deadline
    ? Math.ceil(
        (new Date(project.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <Card
      className="group relative overflow-hidden flex flex-col justify-between transition-all duration-300 rounded-3xl"
      style={{
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(186, 230, 253, 0.7)",
        boxShadow: "0 10px 30px -10px rgba(2, 136, 209, 0.06)",
      }}
    >
      <CardHeader className="p-5 sm:p-6 pb-3 space-y-3 relative z-10">
        {/* Header row: Organization & Match Score Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold truncate">
            <Building2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span className="truncate text-slate-700">
              {project.vendor?.organizationName || "Organisasi Vendor"}
            </span>
            {project.vendor?.location && (
              <>
                <span className="text-slate-300">•</span>
                <span className="truncate flex items-center gap-0.5 text-slate-500">
                  <MapPin className="h-3 w-3 text-sky-500 shrink-0" />
                  {project.vendor.location}
                </span>
              </>
            )}
          </div>
          <div className="shrink-0">
            <MatchScoreBadge score={project.matchResult.score} size="md" />
          </div>
        </div>

        {/* Project Title */}
        <Link href={`/talent/projects/${project.id}`}>
          <h3 className="text-lg font-black text-[#0F172A] group-hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
            {project.title}
          </h3>
        </Link>

        {/* Badges: Difficulty, Type, Mode */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={diffInfo.variant} className="text-2xs font-bold px-2.5 py-0.5">
            {diffInfo.label}
          </Badge>
          <Badge variant={typeInfo.variant} className="text-2xs font-bold px-2.5 py-0.5">
            {typeInfo.label}
          </Badge>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-sky-50 text-sky-800 border border-sky-100">
            <span>{modeInfo.icon}</span>
            <span>{modeInfo.label}</span>
          </span>
          {project.hoursPerWeek && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
              <Clock className="h-3 w-3" />
              <span>{project.hoursPerWeek} jam/mgg</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 py-2 space-y-4 relative z-10">
        {/* Project short excerpt */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
          {project.description}
        </p>

        {/* Required Skills list */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Keahlian Yang Dibutuhkan</span>
            <span className="text-sky-700 font-extrabold">
              {project.skills.filter((s) => s.talentStatus.isAdequate).length} /{" "}
              {project.skills.length} cocok
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {project.skills.map((skill) => {
              const isAdequate = skill.talentStatus.isAdequate;
              const possessed = skill.talentStatus.possessed;

              return (
                <span
                  key={skill.skillId}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    isAdequate
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : possessed
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-slate-50 text-slate-600 border border-slate-200"
                  }`}
                  title={
                    isAdequate
                      ? `Kamu menguasai ${skill.name} (${skill.talentStatus.talentLevel})`
                      : possessed
                      ? `Levelmu: ${skill.talentStatus.talentLevel}, butuh: ${skill.minLevel}`
                      : `Belum ditambahkan`
                  }
                >
                  {isAdequate && (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  )}
                  {possessed && !isAdequate && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                  <span>{skill.name}</span>
                  {skill.isRequired && (
                    <span className="text-rose-500 text-2xs font-black" title="Wajib">*</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Key Info: Duration & Reward */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-sky-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-2xs text-slate-400 block font-semibold">Estimasi Imbalan</span>
            <div className="flex items-center gap-1 font-extrabold text-[#0F172A] truncate">
              <Coins className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span className="truncate">{formattedReward}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-2xs text-slate-400 block font-semibold">Batas Waktu</span>
            <div className="flex items-center gap-1 font-bold text-slate-700 truncate">
              <Calendar className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span className="truncate">{formattedDeadline}</span>
              {daysLeft !== null && daysLeft <= 5 && daysLeft >= 0 && (
                <span className="text-2xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 rounded-md">
                  {daysLeft === 0 ? "Hari ini" : `${daysLeft}h lagi`}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 sm:px-6 pt-3 border-t border-sky-100 flex items-center justify-between gap-3 bg-sky-50/40 rounded-b-3xl relative z-10">
        <div className="text-2xs text-slate-500 font-semibold truncate">
          {project.durationWeeks
            ? `Durasi: ${project.durationWeeks} minggu`
            : "Durasi fleksibel"}
        </div>

        <Link href={`/talent/projects/${project.id}`}>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold shadow-sm shadow-sky-500/25 h-8.5 text-xs rounded-xl"
          >
            <span>Lihat Detail</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
