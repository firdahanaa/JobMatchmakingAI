import React from "react";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { ApplicationsList } from "@/components/talent/applications-list";
import { TalentPageNavigation } from "@/components/talent/talent-page-navigation";
import { getMyApplications } from "./actions";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lamaran Saya",
  description: "Pantau status lamaran proyek, skor kecocokan, dan perkembangan proses seleksi.",
};

export default async function TalentApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: applications, error } = await getMyApplications();

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const acceptedCount = applications.filter((a) => a.status === "accepted").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="relative mb-8 overflow-hidden rounded-[2.5rem] border border-sky-100 bg-white p-6 shadow-xl sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-sky-400/20 to-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-sky-300/20 to-indigo-400/20 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-sky-50/50 px-3 py-1.5 shadow-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md">
                    <Briefcase className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Progres Karier
                  </span>
                </div>

                <h1 className="text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-4xl md:text-5xl">
                  Lamaran Saya
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                    Pantau Perkembanganmu
                  </span>
                </h1>

                <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                  Pantau status dan perkembangan lamaran proyek yang telah kamu kirimkan.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sky-100 pt-5">
                <TalentPageNavigation activePage="applications" />
              </div>
            </div>
          </div>

          {/* Quick Status Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/50 transition-all">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Dilamar
              </span>
              <span className="text-2xl font-black text-[#0F172A] block mt-1">
                {applications.length}
              </span>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm transition-all">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                Menunggu Review
              </span>
              <span className="text-2xl font-black text-amber-900 block mt-1">
                {pendingCount}
              </span>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm transition-all">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                Diterima
              </span>
              <span className="text-2xl font-black text-emerald-900 block mt-1">
                {acceptedCount}
              </span>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/50 transition-all">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Selesai / Lainnya
              </span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {applications.length - pendingCount - acceptedCount}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Applications List Component */}
          <ApplicationsList initialApplications={applications} />
        </div>
      </main>
    </div>
  );
}
