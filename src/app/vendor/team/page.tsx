"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { VendorPageNavigation } from "@/components/vendor/vendor-page-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  getCompanyWorkspaceOverview,
  updateCompanyMemberRoleOrStatus,
  type CompanyWorkspaceOverview,
} from "../company-actions";
import type { CompanyMemberStatus, CompanyRole } from "@/types/database";
import { ShieldCheck, UserCog, MailPlus, AlertCircle } from "lucide-react";

const ROLE_LABELS: Record<CompanyRole, string> = {
  company_owner: "Company Owner",
  hr_admin: "HR Admin",
  hr_recruiter: "HR Recruiter",
};

export default function VendorTeamPage() {
  const [overview, setOverview] = React.useState<CompanyWorkspaceOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    const res = await getCompanyWorkspaceOverview();
    if (res.data) {
      setOverview(res.data);
      setError(null);
    } else {
      setError(res.error || "Gagal memuat daftar tim HR.");
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let active = true;
    getCompanyWorkspaceOverview().then((res) => {
      if (!active) return;
      if (res.data) {
        setOverview(res.data);
        setError(null);
      } else {
        setError(res.error || "Gagal memuat daftar tim HR.");
      }
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleMemberChange = async (
    memberUserId: string,
    nextRole?: CompanyRole,
    nextStatus?: CompanyMemberStatus,
  ) => {
    setUpdatingUserId(memberUserId);
    const res = await updateCompanyMemberRoleOrStatus({
      memberUserId,
      role: nextRole,
      status: nextStatus,
    });
    setUpdatingUserId(null);

    if (res.success) {
      toast.success("Data keanggotaan tim berhasil diperbarui.");
      await loadData();
    } else {
      toast.error(res.error || "Gagal memperbarui anggota tim.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <VendorPageNavigation activePage="team" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3728]">
                Manajemen Tim HR &amp; Akses Perusahaan
              </h1>
              <p className="text-xs sm:text-sm text-[#7a6559] mt-0.5">
                Kelola peran Company Owner, HR Admin, dan HR Recruiter dengan isolasi data tingkat perusahaan.
              </p>
            </div>

            <Link href="/vendor/invitations">
              <Button size="sm" className="bg-[#C98B75] hover:bg-[#b87a65] text-white gap-1.5 text-xs">
                <MailPlus className="h-4 w-4" />
                <span>Undang Anggota HR</span>
              </Button>
            </Link>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-10 text-center text-xs text-[#8a7668]">
              Memuat anggota tim perusahaan...
            </div>
          ) : overview ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e8d5d0] bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F7ECEA] text-[#b87a65]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#4a3728] text-sm">{overview.company.name}</h2>
                    <p className="text-2xs text-[#8a7668]">
                      Peran aktif Anda:{" "}
                      <strong className="text-[#5c4639]">{ROLE_LABELS[overview.actorRole]}</strong>
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="w-fit text-2xs">
                  {overview.members.filter((m) => m.status === "active").length} Anggota Aktif
                </Badge>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#e8d5d0] bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8d5d0] bg-[#fbf8f6] text-[#695449] uppercase text-2xs font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Nama Anggota</th>
                      <th className="py-3.5 px-4">Peran HR</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Bergabung</th>
                      {overview.canManageTeam && (
                        <th className="py-3.5 px-4 text-right">Pengaturan Akses</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7ECEA]">
                    {overview.members.map((member) => {
                      const isUpdating = updatingUserId === member.user_id;
                      return (
                        <tr key={member.user_id} className="hover:bg-[#fbf8f6]">
                          <td className="py-3.5 px-4 font-bold text-[#4a3728]">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4 text-[#C98B75]" />
                              <span>{member.fullName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {overview.canManageTeam ? (
                              <Select
                                value={member.role}
                                disabled={isUpdating}
                                onChange={(e) =>
                                  handleMemberChange(
                                    member.user_id,
                                    e.target.value as CompanyRole,
                                    member.status,
                                  )
                                }
                                className="h-8 text-xs w-44"
                              >
                                <option value="company_owner">Company Owner</option>
                                <option value="hr_admin">HR Admin</option>
                                <option value="hr_recruiter">HR Recruiter</option>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="text-2xs">
                                {ROLE_LABELS[member.role]}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={member.status === "active" ? "success" : "destructive"}
                              className="text-2xs capitalize"
                            >
                              {member.status === "active" ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-[#8a7668]">
                            {new Date(member.joined_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          {overview.canManageTeam && (
                            <td className="py-3.5 px-4 text-right">
                              {member.status === "active" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    handleMemberChange(member.user_id, member.role, "disabled")
                                  }
                                  className="h-7 text-2xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                >
                                  Nonaktifkan
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    handleMemberChange(member.user_id, member.role, "active")
                                  }
                                  className="h-7 text-2xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  Pulihkan Akses
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
