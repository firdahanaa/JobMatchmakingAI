import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  FolderSearch,
  AlertCircle,
  ArrowRight,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/talent/project-card";
import { ProjectFilterBar } from "@/components/talent/project-filter-bar";
import { getTalentProjects, type TalentProjectsFilter } from "./actions";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eksplorasi Proyek",
  description: "Temukan proyek freelance dan volunteer yang sesuai dengan keahlianmu berdasarkan AI Matchmaking.",
};

interface TalentProjectsPageProps {
  searchParams: Promise<{
    q?: string;
    difficulty?: string;
    type?: string;
    mode?: string;
    sort?: string;
  }>;
}

export default async function TalentProjectsPage({ searchParams }: TalentProjectsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const filter: TalentProjectsFilter = {
    q: resolvedParams.q,
    difficulty: resolvedParams.difficulty,
    type: resolvedParams.type,
    mode: resolvedParams.mode,
    sort: resolvedParams.sort || "match",
  };

  const {
    projects,
    totalOpenProjects,
    hasConfiguredSkills,
    error,
  } = await getTalentProjects(filter);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Matchmaking Engine
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Eksplorasi Proyek Untuk Talenta
                </h1>
                <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
                  Semua proyek terbuka diurutkan otomatis berdasarkan kecocokan keahlian (Match Score) dengan profilmu.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/talent/profile">
                  <Button
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 hover:text-white text-xs font-semibold gap-2"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Kelola Keahlian Saya
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Warning Banner: Profil/Keahlian masih kosong */}
          {!hasConfiguredSkills && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Profil Keahlianmu Belum Dilengkapi
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Tambahkan keahlian dan preferensi jam kerjamu agar AI dapat menghitung Match Score secara akurat dan memberikan rekomendasi proyek terbaik.
                    </p>
                  </div>
                </div>
                <Link href="/talent/profile" className="shrink-0">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
                  >
                    <span>Lengkapi Keahlian Sekarang</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <ProjectFilterBar />

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Count & Current Active Sort/Filters */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Menampilkan{" "}
              <strong className="text-slate-800">{projects.length}</strong> dari{" "}
              <strong className="text-slate-800">{totalOpenProjects}</strong> proyek terbuka
            </span>
            {filter.sort === "match" && (
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Terurut kecocokan AI tertinggi
              </span>
            )}
          </div>

          {/* Projects Grid or Empty States */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : totalOpenProjects === 0 ? (
            /* Empty State: Belum ada proyek di database */
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-2xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                <FolderSearch className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Belum Ada Proyek Terbuka
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Saat ini belum ada organisasi vendor yang memposting proyek baru berstatus terbuka. Silakan periksa kembali beberapa saat lagi.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/talent/profile">
                  <Button variant="outline" className="text-xs gap-2">
                    <UserCheck className="h-4 w-4" />
                    Perbarui Profil & Portofolio
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Empty State: Filter tidak menemukan hasil */
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-2xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FolderSearch className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Tidak Ada Proyek yang Cocok dengan Filter
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Coba ubah kata kunci pencarian atau sesuaikan pilihan filter kesulitan, tipe proyek, atau mode kerja.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/talent/projects">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5">
                    <span>Hapus Semua Filter</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
