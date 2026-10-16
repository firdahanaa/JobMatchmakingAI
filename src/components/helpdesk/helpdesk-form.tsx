"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, Send, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HELPDESK_EMAIL } from "@/lib/config";
import { HELPDESK_CATEGORIES, helpdeskSchema } from "@/lib/validators/helpdesk";

type RelatedProject = { id: string; title: string };
type RelatedApplication = { id: string; projectId: string; projectTitle: string };

interface HelpdeskFormProps {
  userName: string;
  userEmail: string;
  userRole: "talent" | "vendor";
  projects: RelatedProject[];
  applications: RelatedApplication[];
  initialProjectId?: string;
  initialApplicationId?: string;
}

export function HelpdeskForm({
  userName,
  userEmail,
  userRole,
  projects,
  applications,
  initialProjectId = "",
  initialApplicationId = "",
}: HelpdeskFormProps) {
  const [category, setCategory] = useState<(typeof HELPDESK_CATEGORIES)[number]>(
    initialApplicationId ? "Lamaran" : initialProjectId ? "Project" : "Lainnya"
  );
  const [projectId, setProjectId] = useState(initialProjectId);
  const [applicationId, setApplicationId] = useState(initialApplicationId);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApplicationChange = (nextApplicationId: string) => {
    setApplicationId(nextApplicationId);
    const application = applications.find((item) => item.id === nextApplicationId);
    if (application) setProjectId(application.projectId);
  };

  const handleProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    const selectedApplication = applications.find((item) => item.id === applicationId);
    if (selectedApplication && selectedApplication.projectId !== nextProjectId) {
      setApplicationId("");
    }
  };

  const selectedApplication = applications.find((item) => item.id === applicationId);
  const selectedProject = projects.find((item) => item.id === projectId);
  const projectTitle = selectedApplication?.projectTitle || selectedProject?.title;
  const currentSubject = `[Help Desk] ${category}${projectTitle ? ` - ${projectTitle}` : ""}`;
  const currentBody = [
    `Nama: ${userName || "-"}`,
    `Email akun: ${userEmail || "-"}`,
    `Role: ${userRole === "talent" ? "Talent" : "Vendor"}`,
    `ID lamaran: ${applicationId || "-"}`,
    `ID project: ${projectId || selectedApplication?.projectId || "-"}`,
    "",
    "Deskripsi kendala:",
    description.trim(),
  ].join("\n");

  const recipient = encodeURIComponent(HELPDESK_EMAIL);
  const encodedSubject = encodeURIComponent(currentSubject);
  const encodedBody = encodeURIComponent(currentBody);
  const liveMailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
  const liveGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodedSubject}&body=${encodedBody}`;

  const isFormValid = (): boolean => {
    const trimmed = description.trim();
    if (trimmed.length < 20) return false;
    const validation = helpdeskSchema.safeParse({
      category,
      projectId: projectId || undefined,
      applicationId: applicationId || undefined,
      description: trimmed,
    });
    return validation.success;
  };

  const validateAndNotify = (): boolean => {
    const trimmed = description.trim();
    if (trimmed.length < 20) {
      const msg = `Deskripsi kendala minimal 20 karakter (saat ini ${trimmed.length} karakter).`;
      setError(msg);
      toast.error(msg);
      return false;
    }

    const validation = helpdeskSchema.safeParse({
      category,
      projectId: projectId || undefined,
      applicationId: applicationId || undefined,
      description: trimmed,
    });

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || "Periksa kembali laporan kendala.";
      setError(msg);
      toast.error(msg);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateAndNotify()) return;

    toast.success("Membuka Gmail Web...");
    window.open(liveGmailUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${currentSubject}\n\n${currentBody}`);
      setCopied(true);
      toast.success("Isi pesan berhasil disalin ke clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard tidak tersedia di browser ini.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-950 sm:p-5">
        <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sky-900 text-sm">Alur Pengiriman Laporan Bantuan</p>
          <p className="text-sky-800 leading-relaxed">
            Form ini menyusun isi laporan kendala secara otomatis ke{" "}
            <span className="font-mono font-bold text-sky-950">{HELPDESK_EMAIL}</span>.
            Klik tombol kirim di bawah untuk membuka draf email yang sudah terisi lengkap.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="helpdesk-category">Kategori Kendala <span className="text-rose-500">*</span></Label>
            <select
              id="helpdesk-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof HELPDESK_CATEGORIES)[number])}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {HELPDESK_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="helpdesk-project">Project terkait (opsional)</Label>
            <select
              id="helpdesk-project"
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Tidak terkait project tertentu</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpdesk-application">Lamaran terkait (opsional)</Label>
          <select
            id="helpdesk-application"
            value={applicationId}
            onChange={(event) => handleApplicationChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Tidak terkait lamaran tertentu</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.projectTitle} · {application.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="helpdesk-description">
              Deskripsi kendala <span className="text-rose-500">*</span>
            </Label>
            <span
              className={`text-xs font-semibold ${
                description.trim().length >= 20 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {description.trim().length}/5000 (minimal 20 karakter)
            </span>
          </div>
          <Textarea
            id="helpdesk-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (error && event.target.value.trim().length >= 20) {
                setError(null);
              }
            }}
            maxLength={5000}
            rows={6}
            placeholder="Ceritakan kendala yang terjadi secara rinci dan langkah yang sudah dicoba (minimal 20 karakter)..."
            className="focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div>
            <a
              href={isFormValid() ? liveGmailUrl : "#"}
              target={isFormValid() ? "_blank" : undefined}
              rel={isFormValid() ? "noopener noreferrer" : undefined}
              onClick={(event) => {
                if (!validateAndNotify()) {
                  event.preventDefault();
                } else {
                  toast.success("Membuka Gmail Web di tab baru...");
                }
              }}
              className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-11 rounded-xl shadow-xs transition-colors text-sm w-full sm:w-auto"
            >
              <Send className="h-4 w-4" />
              Kirim Laporan via Email
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Bukan pengguna Gmail?</span>
            <a
              href={isFormValid() ? liveMailtoUrl : "#"}
              onClick={(event) => {
                if (!validateAndNotify()) {
                  event.preventDefault();
                } else {
                  toast.success("Membuka aplikasi email...");
                }
              }}
              className="font-medium text-sky-600 hover:text-sky-800 underline inline-flex items-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" />
              Buka aplikasi email default
            </a>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                if (validateAndNotify()) {
                  handleCopy();
                }
              }}
              className="font-medium text-slate-600 hover:text-slate-900 underline inline-flex items-center gap-1 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin!" : "Salin isi pesan"}
            </button>
          </div>
        </div>
      </form>

      {/* Pratinjau pesan yang disusun secara real-time */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Pratinjau Format Laporan yang Diteruskan</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5 text-xs border-slate-300"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Tersalin!" : "Salin Format"}
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-mono text-slate-700 space-y-1.5 shadow-2xs">
          <p><span className="text-slate-400 font-semibold font-sans">Tujuan:</span> {HELPDESK_EMAIL}</p>
          <p><span className="text-slate-400 font-semibold font-sans">Subjek:</span> {currentSubject}</p>
          <div className="mt-2 border-t border-slate-100 pt-2 whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">
            {currentBody}
          </div>
        </div>
      </section>
    </div>
  );
}
