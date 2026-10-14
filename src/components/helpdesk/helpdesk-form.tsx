"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Mail, Send } from "lucide-react";
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

interface PreparedMessage {
  subject: string;
  body: string;
  mailtoUrl: string;
  gmailUrl: string;
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
  const [preparedMessage, setPreparedMessage] = useState<PreparedMessage | null>(null);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = helpdeskSchema.safeParse({ category, projectId, applicationId, description });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Periksa kembali laporan kendala.");
      return;
    }

    const selectedApplication = applications.find((item) => item.id === validation.data.applicationId);
    const selectedProject = projects.find((item) => item.id === validation.data.projectId);
    const projectTitle = selectedApplication?.projectTitle || selectedProject?.title;
    const subject = `[Help Desk] ${validation.data.category}${projectTitle ? ` - ${projectTitle}` : ""}`;
    const body = [
      `Nama: ${userName || "-"}`,
      `Email akun: ${userEmail || "-"}`,
      `Role: ${userRole === "talent" ? "Talent" : "Vendor"}`,
      `ID lamaran: ${validation.data.applicationId || "-"}`,
      `ID project: ${validation.data.projectId || selectedApplication?.projectId || "-"}`,
      "",
      "Deskripsi kendala:",
      validation.data.description,
    ].join("\n");
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const recipient = encodeURIComponent(HELPDESK_EMAIL);

    const message = {
      subject,
      body,
      mailtoUrl: `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`,
      gmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodedSubject}&body=${encodedBody}`,
    };

    setError(null);
    setPreparedMessage(message);
    window.location.href = message.mailtoUrl;
  };

  const handleCopy = async () => {
    if (!preparedMessage) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${preparedMessage.subject}\n\n${preparedMessage.body}`);
      toast.success("Isi pesan berhasil disalin.");
    } catch {
      toast.error("Clipboard tidak tersedia di browser ini.");
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="helpdesk-category">Kategori</Label>
            <select
              id="helpdesk-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof HELPDESK_CATEGORIES)[number])}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              {HELPDESK_CATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="helpdesk-project">Project terkait (opsional)</Label>
            <select
              id="helpdesk-project"
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="">Tidak terkait project tertentu</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpdesk-application">Lamaran terkait (opsional)</Label>
          <select
            id="helpdesk-application"
            value={applicationId}
            onChange={(event) => handleApplicationChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
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
            <Label htmlFor="helpdesk-description">Deskripsi kendala</Label>
            <span className="text-xs text-slate-500">{description.length}/5000</span>
          </div>
          <Textarea
            id="helpdesk-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength={20}
            maxLength={5000}
            rows={6}
            placeholder="Ceritakan kendala yang terjadi dan langkah yang sudah dicoba."
            required
          />
        </div>

        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}

        <Button type="submit" disabled={description.trim().length < 20} className="gap-2">
          <Send className="h-4 w-4" />
          Kirim laporan
        </Button>
      </form>

      {preparedMessage && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
          <h2 className="font-bold text-emerald-950">Pesan sudah disiapkan</h2>
          <p className="mt-1 text-sm text-emerald-900">Jika aplikasi email tidak terbuka, salin isi pesan atau lanjutkan di Gmail.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" /> Salin isi pesan
            </Button>
            <a href={preparedMessage.gmailUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> Buka di Gmail
              </Button>
            </a>
            <a href={preparedMessage.mailtoUrl}>
              <Button type="button" className="gap-2">
                <Mail className="h-4 w-4" /> Coba buka email
              </Button>
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
