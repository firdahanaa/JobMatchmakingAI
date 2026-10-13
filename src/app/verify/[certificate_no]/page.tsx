import { BadgeCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface VerifyCertificatePageProps {
  params: Promise<{ certificate_no: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyCertificatePageProps) {
  const { certificate_no: certificateNo } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", {
    p_certificate_no: certificateNo,
  });
  const certificate = Array.isArray(data) ? data[0] : data;

  if (error || !certificate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10">
        <section className="w-full max-w-xl rounded-2xl border border-violet-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Sertifikat tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Nomor sertifikat tidak terdaftar atau tidak dapat diverifikasi.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-violet-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Pathfolio · Verifikasi Sertifikat</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Sertifikat Penyelesaian Project</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <BadgeCheck className="h-4 w-4" />
            {certificate.verification_status}
          </span>
        </div>

        <dl className="mt-8 grid gap-5 border-t border-violet-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Talent</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{certificate.talent_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Project</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{certificate.project_title}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Vendor / Organisasi</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{certificate.vendor_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Tanggal penyelesaian</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {certificate.completed_at
                ? new Date(certificate.completed_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                : "-"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500">Nomor sertifikat</dt>
            <dd className="mt-1 font-mono text-sm font-bold text-violet-800">{certificate.certificate_no}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
