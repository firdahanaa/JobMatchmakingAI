"use client";

import * as React from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { VendorPageNavigation } from "@/components/vendor/vendor-page-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  acceptCompanyInvitationAction,
  createCompanyInvitation,
  getCompanyWorkspaceOverview,
  revokeCompanyInvitation,
  type CompanyWorkspaceOverview,
} from "../company-actions";
import type { InvitableCompanyRole } from "@/lib/auth/invitations";
import { MailPlus, KeyRound, Copy, XCircle, CheckCircle2 } from "lucide-react";

export default function VendorInvitationsPage() {
  const [overview, setOverview] = React.useState<CompanyWorkspaceOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Create invitation state
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<InvitableCompanyRole>("hr_recruiter");
  const [isCreating, setIsCreating] = React.useState(false);
  const [generatedToken, setGeneratedToken] = React.useState<string | null>(null);

  // Accept invitation state
  const [inputToken, setInputToken] = React.useState("");
  const [isAccepting, setIsAccepting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const res = await getCompanyWorkspaceOverview();
    if (res.data) {
      setOverview(res.data);
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let active = true;
    getCompanyWorkspaceOverview().then((res) => {
      if (!active) return;
      if (res.data) {
        setOverview(res.data);
      }
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setGeneratedToken(null);

    const res = await createCompanyInvitation({ email, role });
    setIsCreating(false);

    if (res.success && res.rawToken) {
      setGeneratedToken(res.rawToken);
      setEmail("");
      toast.success("Undangan berhasil dibuat! Salin token sekali-pakai di bawah.");
      await loadData();
    } else {
      toast.error(res.error || "Gagal membuat undangan.");
    }
  };

  const handleRevoke = async (invitationId: string) => {
    const res = await revokeCompanyInvitation(invitationId);
    if (res.success) {
      toast.success("Undangan dibatalkan.");
      await loadData();
    } else {
      toast.error(res.error || "Gagal membatalkan undangan.");
    }
  };

  const handleAcceptToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccepting(true);
    const res = await acceptCompanyInvitationAction(inputToken);
    setIsAccepting(false);

    if (res.success) {
      toast.success("Berhasil bergabung ke workspace perusahaan!");
      setInputToken("");
      await loadData();
    } else {
      toast.error(res.error || "Token undangan tidak dapat diterima.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <VendorPageNavigation activePage="invitations" />

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3728]">
              Undangan Tim HR (Single-Use Token)
            </h1>
            <p className="text-xs sm:text-sm text-[#7a6559] mt-0.5">
              Undang HR Admin atau HR Recruiter menggunakan token kriptografis sekali-pakai yang diverifikasi terhadap email terkonfirmasi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Invitation Card */}
            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F7ECEA] text-[#b87a65]">
                  <MailPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#4a3728] text-sm">Buat Undangan HR Baru</h2>
                  <p className="text-2xs text-[#8a7668]">Hanya tersedia bagi Company Owner</p>
                </div>
              </div>

              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email" className="text-xs">
                    Email Tujuan Undangan
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="hr.recruiter@perusahaan.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!overview?.canManageTeam || isCreating}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-role" className="text-xs">
                    Peran di Perusahaan
                  </Label>
                  <Select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as InvitableCompanyRole)}
                    disabled={!overview?.canManageTeam || isCreating}
                  >
                    <option value="hr_admin">HR Admin (Kelola Lowongan, Kriteria &amp; Pelamar)</option>
                    <option value="hr_recruiter">HR Recruiter (Evaluasi &amp; Seleksi Pelamar)</option>
                  </Select>
                </div>

                <Button
                  type="submit"
                  isLoading={isCreating}
                  disabled={!overview?.canManageTeam}
                  className="w-full bg-[#C98B75] hover:bg-[#b87a65] text-white text-xs"
                >
                  Buat Token Undangan (Berlaku 7 Hari)
                </Button>
              </form>

              {generatedToken && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Token Undangan Sekali-Pakai
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedToken);
                        toast.success("Token disalin ke clipboard.");
                      }}
                      className="h-7 text-2xs gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Salin
                    </Button>
                  </div>
                  <code className="block break-all rounded bg-white p-2 text-2xs font-mono text-slate-800 border border-emerald-200">
                    {generatedToken}
                  </code>
                  <p className="text-3xs text-emerald-800">
                    Simpan token ini sekarang. Server hanya menyimpan hash SHA-256 sehingga token mentah tidak akan ditampilkan lagi.
                  </p>
                </div>
              )}
            </div>

            {/* Accept Invitation Card */}
            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F7ECEA] text-[#b87a65]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#4a3728] text-sm">Terima Token Undangan</h2>
                  <p className="text-2xs text-[#8a7668]">
                    Masukkan token undangan yang dikirimkan kepada email akun Anda
                  </p>
                </div>
              </div>

              <form onSubmit={handleAcceptToken} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accept-token" className="text-xs">
                    Token Undangan (64 karakter hex)
                  </Label>
                  <Input
                    id="accept-token"
                    type="text"
                    required
                    placeholder="Tempel token undangan di sini..."
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  isLoading={isAccepting}
                  className="w-full text-xs font-bold"
                >
                  Verifikasi &amp; Gabung ke Workspace
                </Button>
              </form>
            </div>
          </div>

          {/* Invitations History Table */}
          <div className="overflow-hidden rounded-2xl border border-[#e8d5d0] bg-white shadow-xs">
            <div className="p-4 border-b border-[#e8d5d0] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#4a3728]">Riwayat Undangan Perusahaan</h3>
              <Badge variant="outline" className="text-2xs">
                {overview?.invitations.length ?? 0} Undangan
              </Badge>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#8a7668]">Memuat riwayat undangan...</div>
            ) : overview && overview.invitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8d5d0] bg-[#fbf8f6] text-[#695449] uppercase text-2xs font-bold">
                    <tr>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Peran</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Kedaluwarsa</th>
                      {overview.canManageTeam && <th className="py-3 px-4 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7ECEA]">
                    {overview.invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-3 px-4 font-semibold text-[#4a3728]">{inv.email}</td>
                        <td className="py-3 px-4 capitalize">{inv.role.replace("_", " ")}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              inv.status === "accepted"
                                ? "success"
                                : inv.status === "pending"
                                ? "warning"
                                : "secondary"
                            }
                            className="text-3xs capitalize"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#8a7668]">
                          {new Date(inv.expires_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        {overview.canManageTeam && (
                          <td className="py-3 px-4 text-right">
                            {inv.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(inv.id)}
                                className="h-7 text-2xs text-rose-600 hover:bg-rose-50 gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Batalkan
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8a7668]">
                Belum ada undangan tim yang dibuat pada perusahaan ini.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
