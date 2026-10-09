"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  Users,
  Edit,
  Trash2,
  Coins,
  MapPin,
  Clock,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ProjectStatusBadge } from "./project-status-badge";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { updateProjectStatus, deleteProject, type VendorProjectWithStats } from "@/app/vendor/projects/actions";
import { toast } from "sonner";
import type { ProjectStatus } from "@/types/database";

interface VendorProjectsListProps {
  initialProjects: VendorProjectWithStats[];
}

export function VendorProjectsList({ initialProjects }: VendorProjectsListProps) {
  const router = useRouter();
  const [projects, setProjects] = React.useState<VendorProjectWithStats[]>(initialProjects);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<string | null>(null);

  // Delete dialog states
  const [projectToDelete, setProjectToDelete] = React.useState<VendorProjectWithStats | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Filter projects
  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = project.title.toLowerCase().includes(query);
        const matchesDesc = project.description.toLowerCase().includes(query);
        const matchesSkill = project.skills.some((s) =>
          s.skill?.name.toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesSkill;
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  // Quick update status (open, closed, completed)
  const handleStatusChange = async (projectId: string, newStatus: "open" | "closed" | "completed") => {
    setIsUpdatingStatus(projectId);
    const res = await updateProjectStatus(projectId, newStatus);
    setIsUpdatingStatus(null);

    if (res.success) {
      toast.success(`Status proyek berhasil diubah menjadi ${newStatus}.`);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus as ProjectStatus } : p))
      );
      router.refresh();
    } else {
      toast.error(res.error || "Gagal mengubah status proyek.");
    }
  };

  // Confirm delete project
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    const res = await deleteProject(projectToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      toast.success(`Proyek "${projectToDelete.title}" berhasil dihapus.`);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal menghapus proyek.");
    }
  };

  const STATUS_TABS = [
    { label: "Semua", value: "all", count: projects.length },
    { label: "Open", value: "open", count: projects.filter((p) => p.status === "open").length },
    { label: "Draft", value: "draft", count: projects.filter((p) => p.status === "draft").length },
    { label: "Selesai", value: "completed", count: projects.filter((p) => p.status === "completed").length },
    { label: "Ditutup", value: "closed", count: projects.filter((p) => p.status === "closed").length },
  ];

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-[#e8d5d0] bg-white/80 p-4 shadow-sm shadow-[#695449]/5 sm:p-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Input
            placeholder="Cari berdasarkan judul, deskripsi, atau skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari proyek berdasarkan judul, deskripsi, atau skill"
            className="h-12 rounded-2xl border-[#e8d5d0] bg-[#fbf8f6] pl-11 pr-4 text-sm shadow-none placeholder:text-[#a89080] focus-visible:bg-white"
          />
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89080]" />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
              statusFilter === tab.value
                ? "bg-[#b87a65] text-white shadow-md shadow-[#b87a65]/20"
                : "text-[#7a6559] hover:bg-[#F7ECEA]"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                statusFilter === tab.value
                  ? "bg-white/20 text-white"
                  : "bg-white text-[#695449]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Projects List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const isUpdating = isUpdatingStatus === project.id;
            return (
              <div
                key={project.id}
                className="space-y-4 rounded-2xl border border-[#eadfd9] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4b0a5] hover:shadow-md sm:p-5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectStatusBadge status={project.status} />
                      <Badge variant="outline" className="text-xs uppercase font-medium">
                        {project.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize font-medium">
                        {project.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-[#8a7668] font-medium">
                        <MapPin className="h-3.5 w-3.5 text-[#a89080]" />
                        <span className="capitalize">{project.mode}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold leading-snug text-[#4a3728] sm:text-xl">
                      {project.title}
                    </h3>
                  </div>

                  {/* Applicants Count Badge / Link */}
                  <Link
                    href={`/vendor/projects/${project.id}/applicants`}
                    aria-label={`Lihat ${project.applicantCount} pelamar untuk ${project.title}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#eadfd9] bg-[#fbf8f6] px-3.5 py-2.5 transition-colors hover:border-[#d4b0a5] hover:bg-[#F7ECEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b87a65] focus-visible:ring-offset-2"
                  >
                    <Users className="h-4 w-4 text-[#b87a65]" />
                    <div className="text-left">
                      <span className="block text-xs font-bold leading-none text-[#7a4f3f]">
                        {project.applicantCount} Pelamar
                      </span>
                      <span className="text-[10px] text-[#8a7668]">Lihat kandidat</span>
                    </div>
                  </Link>
                </div>

                {/* Description snippet */}
                <p className="line-clamp-2 text-sm leading-relaxed text-[#7a6559]">
                  {project.description}
                </p>

                {/* Required Skills Badges */}
                {project.skills && project.skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#f2eae6] pt-3">
                    <span className="mr-1 text-[11px] font-semibold text-[#8a7668]">
                      Skill Dibutuhkan:
                    </span>
                    {project.skills.map((s) => (
                      <span
                        key={s.skill_id}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                          s.is_required
                            ? "bg-[#F7ECEA] text-[#b87a65] border-[#e0c4bc]"
                            : "bg-[#F7ECEA] text-[#7a6559] border-[#e8d5d0]"
                        }`}
                      >
                        <span>{s.skill?.name || `Skill #${s.skill_id}`}</span>
                        <span className="text-[9px] opacity-70">({s.min_level})</span>
                        {s.is_required && (
                          <span className="text-[9px] text-[#b87a65] font-bold" title="Wajib">
                            *
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Top Applicant Highlight (Requirement: Pelamar teratas nama + match %) */}
                {project.topApplicant ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#F7ECEA]/70 border border-[#F7ECEA] text-xs mt-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-[#e0c4bc] text-[#a66d5a] flex items-center justify-center font-bold text-xs shrink-0">
                        {project.topApplicant.talentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-[#b87a65] font-semibold block leading-tight">
                          Pelamar Teratas (Skor Tertinggi)
                        </span>
                        <span className="font-bold text-[#4a3728] text-xs truncate">
                          {project.topApplicant.talentName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {project.topApplicant.matchScore !== null ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-tight ${
                            project.topApplicant.matchScore >= 85
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : project.topApplicant.matchScore >= 70
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-[#F7ECEA] text-[#695449] border border-[#d4b0a5]"
                          }`}
                        >
                          Match {Math.round(project.topApplicant.matchScore)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#a89080]">Belum ada skor</span>
                      )}
                      <Link href={`/vendor/projects/${project.id}/applicants`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-[#b87a65] hover:text-[#7a4f3f] font-bold">
                          Lihat Pelamar
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : project.applicantCount > 0 ? (
                  <div className="p-2.5 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] text-xs text-[#8a7668] flex items-center justify-between mt-1">
                    <span>{project.applicantCount} pelamar terdaftar</span>
                    <Link href={`/vendor/projects/${project.id}/applicants`}>
                      <span className="text-[#b87a65] font-semibold hover:underline">Evaluasi Pelamar &rarr;</span>
                    </Link>
                  </div>
                ) : null}

                {/* Bottom Meta & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#F7ECEA] text-xs">
                  {/* Left: Deadline & Reward & Duration */}
                  <div className="flex flex-wrap items-center gap-4 text-[#8a7668]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#a89080]" />
                      <span>
                        Deadline:{" "}
                        <strong className="text-[#695449]">
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Tidak ditentukan"}
                        </strong>
                      </span>
                    </div>

                    {project.reward_amount !== null && project.reward_amount > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Coins className="h-4 w-4 text-emerald-600" />
                        <span>Rp {project.reward_amount.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    {project.hours_per_week && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#a89080]" />
                        <span>{project.hours_per_week} jam/minggu</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Status Changer Quick Select */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#a89080] font-medium hidden sm:inline">
                        Status:
                      </span>
                      <Select
                        value={project.status}
                        onChange={(e) =>
                          handleStatusChange(
                            project.id,
                            e.target.value as "open" | "closed" | "completed"
                          )
                        }
                        disabled={isUpdating}
                        className="h-8 text-xs py-1 w-32"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="completed">Completed</option>
                        <option value="draft" disabled>Draft</option>
                      </Select>
                    </div>

                    {/* Quick Close Button (if open) */}
                    {project.status === "open" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(project.id, "closed")}
                        className="text-xs h-8 text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        Tutup Proyek
                      </Button>
                    )}

                    {/* Quick Reopen Button (if closed) */}
                    {project.status === "closed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(project.id, "open")}
                        className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        Buka Kembali
                      </Button>
                    )}

                    {/* Edit Button */}
                    <Link href={`/vendor/projects/${project.id}/edit`}>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>

                    {/* Delete Button with Dialog */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProjectToDelete(project)}
                      className="h-8 text-xs text-[#a89080] hover:text-rose-600 hover:bg-rose-50"
                      title="Hapus proyek"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d4b0a5] bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7ECEA] text-[#C98B75]">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-bold text-[#4a3728] text-base">
              {searchQuery || statusFilter !== "all"
                ? "Tidak Ada Proyek yang Cocok"
                : "Belum Ada Proyek yang Diposting"}
            </h3>
            <p className="mt-1 text-xs text-[#8a7668] max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Coba ubah kata kunci pencarian atau ganti filter status proyek."
                : "Mulai posting kebutuhan proyek freelance atau volunteer pertama Anda untuk menarik talenta muda potensial."}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteProjectDialog
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        projectTitle={projectToDelete?.title || ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
