import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Coins,
  MapPin,
  Check,
  Building2,
  ArrowRight,
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

  // Format currency
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

  // Format deadline
  const formattedDeadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Fleksibel";

  // Hitung berapa hari tersisa jika ada deadline
  const daysLeft = project.deadline
    ? Math.ceil(
        (new Date(project.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <Card className="flex flex-col justify-between border-slate-200/90 hover:border-purple-300 hover:shadow-md transition-all duration-200 group bg-[#f8fafc] dark:bg-[#f8fafc]">
      <CardHeader className="p-5 pb-3 space-y-3">
        {/* Header row: Organization & Match Score Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {project.vendor?.organizationName || "Organisasi Vendor"}
            </span>
            {project.vendor?.location && (
              <>
                <span className="text-slate-300">•</span>
                <span className="truncate flex items-center gap-0.5">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
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
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug">
            {project.title}
          </h3>
        </Link>

        {/* Badges: Difficulty, Type, Mode */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={diffInfo.variant} className="text-2xs font-medium">
            {diffInfo.label}
          </Badge>
          <Badge variant={typeInfo.variant} className="text-2xs font-medium">
            {typeInfo.label}
          </Badge>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span>{modeInfo.icon}</span>
            <span>{modeInfo.label}</span>
          </span>
          {project.hoursPerWeek && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Clock className="h-3 w-3" />
              <span>{project.hoursPerWeek} jam/mgg</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 py-2 space-y-4">
        {/* Project short excerpt */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Required Skills list with talent possession checkmark */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Keahlian Yang Dibutuhkan</span>
            <span>
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isAdequate
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                      : possessed
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                  title={
                    isAdequate
                      ? `Kamu menguasai ${skill.name} (${skill.talentStatus.talentLevel}) sesuai standar min. ${skill.minLevel}`
                      : possessed
                      ? `Kamu memiliki ${skill.name} (${skill.talentStatus.talentLevel}), tetapi proyek butuh min. ${skill.minLevel}`
                      : `Kamu belum menambahkan ${skill.name} di profilmu`
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
                    <span className="text-rose-500 text-2xs font-bold leading-none" title="Wajib">
                      *
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Key Info: Duration & Reward */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-2xs text-slate-400 block font-medium">Estimasi Imbalan</span>
            <div className="flex items-center gap-1 font-semibold text-slate-900 truncate">
              <Coins className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span className="truncate">{formattedReward}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-2xs text-slate-400 block font-medium">Batas Waktu (Deadline)</span>
            <div className="flex items-center gap-1 font-medium text-slate-700 truncate">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formattedDeadline}</span>
              {daysLeft !== null && daysLeft <= 5 && daysLeft >= 0 && (
                <span className="text-2xs font-bold text-amber-600 bg-amber-50 px-1 rounded">
                  {daysLeft === 0 ? "Hari ini" : `${daysLeft}h lagi`}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-100/70 rounded-b-xl">
        <div className="text-2xs text-slate-500 truncate">
          {project.durationWeeks
            ? `Durasi: ${project.durationWeeks} minggu`
            : "Durasi fleksibel"}
        </div>

        <Link href={`/talent/projects/${project.id}`}>
          <Button
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-none h-8 text-xs"
          >
            <span>Lihat Detail</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
