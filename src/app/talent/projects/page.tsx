import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TalentPageNavigation } from "@/components/talent/talent-page-navigation";
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
    <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Premium Hero-like Header */}
          <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-10 mb-8 border border-sky-100 bg-white shadow-xl">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-gradient-to-br from-sky-400/20 to-blue-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-gradient-to-tr from-sky-300/20 to-indigo-400/20 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex-1 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-sky-50/50 px-3 py-1.5 shadow-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Eksplorasi AI</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] leading-tight">
                  Jelajahi Proyek <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
                    Sesuai Keahlianmu
                  </span>
                </h1>

                <p className="max-w-xl text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                  Temukan ratusan proyek freelance dan volunteer terbaik. Semuanya diurutkan secara cerdas oleh AI berdasarkan Match Score keahlian kamu.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sky-100 pt-5">
                <TalentPageNavigation activePage="projects" />
              </div>
            </div>
          </div>

          {/* Warning Banner: Profil/Keahlian masih kosong */}
          {!hasConfiguredSkills && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-2xs">
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
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
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
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>
              Menampilkan <strong className="text-[#0F172A] font-bold">{projects.length}</strong> dari{" "}
              <strong className="text-[#0F172A] font-bold">{totalOpenProjects}</strong> proyek terbuka
            </span>
            {filter.sort === "match" && (
              <span className="text-sky-700 font-extrabold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                Terurut Match Score AI tertinggi
              </span>
            )}
          </div>

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-12 text-center space-y-4 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                <BookOpen className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-[#0F172A] text-base">
                  Tidak Ada Proyek Ditemukan
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Tidak ada proyek yang cocok dengan kata kunci atau filter pencarian yang kamu pilih. Coba sesuaikan kata kunci atau reset filter.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
