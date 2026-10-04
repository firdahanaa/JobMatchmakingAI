import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Search, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ApplicationsList } from "@/components/talent/applications-list";
import { getMyApplications } from "./actions";
import { createClient } from "@/lib/supabase/server";

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Lamaran Saya
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                Pantau perkembangan status lamaran yang telah kamu kirimkan ke berbagai proyek vendor.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/talent/projects">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-semibold h-9 shadow-xs">
                  <Search className="h-4 w-4" />
                  <span>Cari Proyek Baru</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Status Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-400 block uppercase">
                Total Dilamar
              </span>
              <span className="text-xl font-extrabold text-slate-900 block mt-0.5">
                {applications.length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs">
              <span className="text-2xs font-semibold text-amber-700 block uppercase">
                Menunggu Review
              </span>
              <span className="text-xl font-extrabold text-amber-900 block mt-0.5">
                {pendingCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="text-2xs font-semibold text-emerald-700 block uppercase">
                Diterima
              </span>
              <span className="text-xl font-extrabold text-emerald-900 block mt-0.5">
                {acceptedCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-2xs font-semibold text-slate-400 block uppercase">
                Selesai / Lainnya
              </span>
              <span className="text-xl font-extrabold text-slate-900 block mt-0.5">
                {applications.length - pendingCount - acceptedCount}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Applications List */}
          <ApplicationsList initialApplications={applications} />
        </div>
      </main>
    </div>
  );
}
