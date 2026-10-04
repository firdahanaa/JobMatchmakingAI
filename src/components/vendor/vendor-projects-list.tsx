"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
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
    <div className="space-y-6">
      {/* Search, Filter Pills & Post Project Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Cari berdasarkan judul, deskripsi, atau skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 text-sm"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>

        <Link href="/vendor/projects/new">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-xs shrink-0 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" />
            Posting Proyek Baru
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.value
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.value
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Projects List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.map((project) => {
            const isUpdating = isUpdatingStatus === project.id;
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-purple-200 transition-all space-y-4"
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
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="capitalize">{project.mode}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {project.title}
                    </h3>
                  </div>

                  {/* Applicants Count Badge / Link */}
                  <Link href={`/vendor/projects/${project.id}/applicants`}>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-purple-50 hover:bg-purple-100 px-3.5 py-2 border border-purple-200 transition-colors cursor-pointer shrink-0">
                      <Users className="h-4 w-4 text-purple-700" />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-purple-900 leading-none">
                          {project.applicantCount} Pelamar
                        </span>
                        <span className="text-[10px] text-purple-600">Klik untuk melihat</span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Description snippet */}
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Required Skills Badges */}
                {project.skills && project.skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
                      Skill Dibutuhkan:
                    </span>
                    {project.skills.map((s) => (
                      <span
                        key={s.skill_id}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                          s.is_required
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span>{s.skill?.name || `Skill #${s.skill_id}`}</span>
                        <span className="text-[9px] opacity-70">({s.min_level})</span>
                        {s.is_required && (
                          <span className="text-[9px] text-purple-700 font-bold" title="Wajib">
                            *
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bottom Meta & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
                  {/* Left: Deadline & Reward & Duration */}
                  <div className="flex flex-wrap items-center gap-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>
                        Deadline:{" "}
                        <strong className="text-slate-700">
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
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{project.hours_per_week} jam/minggu</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Status Changer Quick Select */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
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
                      className="h-8 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {searchQuery || statusFilter !== "all"
                ? "Tidak Ada Proyek yang Cocok"
                : "Belum Ada Proyek yang Diposting"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Coba ubah kata kunci pencarian atau ganti filter status proyek."
                : "Mulai posting kebutuhan proyek freelance atau volunteer pertama Anda untuk menarik talenta muda potensial."}
            </p>
          </div>
          <div>
            <Link href="/vendor/projects/new">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-xs">
                <PlusCircle className="h-4 w-4" />
                Posting Proyek Pertama
              </Button>
            </Link>
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
