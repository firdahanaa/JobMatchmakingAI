import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validators/application";

export const runtime = "nodejs";

type ProjectJoin = {
  title: string;
  vendor_profiles:
    | { organization_name: string }
    | { organization_name: string }[]
    | null;
  project_skills?: {
    skills: { name: string } | { name: string }[] | null;
  }[];
};

type ApplicationJoin = {
  completed_at: string | null;
  projects: ProjectJoin | ProjectJoin[] | null;
};

function verificationUrl(origin: string, certificateNo: string): string {
  return new URL(`/verify/${encodeURIComponent(certificateNo)}`, origin).toString();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: applicationId } = await context.params;
  if (!uuidSchema.safeParse(applicationId).success) {
    return Response.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Silakan login untuk mengunduh sertifikat." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "talent") {
    return Response.json({ error: "Hanya talent yang dapat mengunduh sertifikat." }, { status: 403 });
  }

  const { data: certificateData, error: certificateError } = await supabase.rpc(
    "get_or_create_application_certificate",
    { p_application_id: applicationId }
  );
  const certificate = Array.isArray(certificateData) ? certificateData[0] : certificateData;
  if (certificateError || !certificate) {
    return Response.json(
      { error: "Sertifikat hanya tersedia setelah project selesai dan vendor memberi rating." },
      { status: 409 }
    );
  }

  const { data: applicationData, error: applicationError } = await supabase
    .from("applications")
    .select(`
      completed_at,
      projects (
        title,
        vendor_profiles:vendor_id (organization_name),
        project_skills (skills (name))
      )
    `)
    .eq("id", applicationId)
    .eq("talent_id", user.id)
    .maybeSingle();

  if (applicationError || !applicationData) {
    return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
  }

  const application = applicationData as unknown as ApplicationJoin;
  const project = Array.isArray(application.projects)
    ? application.projects[0]
    : application.projects;
  if (!project) {
    return Response.json({ error: "Project sertifikat tidak ditemukan." }, { status: 404 });
  }
  const vendor = Array.isArray(project.vendor_profiles)
    ? project.vendor_profiles[0]
    : project.vendor_profiles;
  const skills = (project.project_skills || []).flatMap((row) => {
    const skill = Array.isArray(row.skills) ? row.skills[0] : row.skills;
    return skill?.name ? [skill.name] : [];
  });
  const issuedDate = new Date(application.completed_at || certificate.issued_at);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const verifyUrl = verificationUrl(origin, certificate.certificate_no);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const purple = rgb(0.31, 0.22, 0.55);
  const deepPurple = rgb(0.20, 0.14, 0.38);
  const palePurple = rgb(0.96, 0.94, 0.99);

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: palePurple });
  page.drawRectangle({
    x: 26,
    y: 26,
    width: 790,
    height: 543,
    color: rgb(1, 1, 1),
    borderColor: purple,
    borderWidth: 2,
  });
  page.drawRectangle({ x: 26, y: 26, width: 12, height: 543, color: purple });

  page.drawText("PATHFOLIO", {
    x: 72,
    y: 510,
    size: 13,
    font: boldFont,
    color: purple,
  });
  page.drawText("Sertifikat Penyelesaian Project", {
    x: 72,
    y: 452,
    size: 27,
    font: boldFont,
    color: deepPurple,
    maxWidth: 690,
  });
  page.drawText("Diberikan kepada", {
    x: 72,
    y: 405,
    size: 13,
    font: regularFont,
    color: rgb(0.38, 0.35, 0.43),
  });
  page.drawText(certificate.talent_name || profile.full_name || "Talent", {
    x: 72,
    y: 362,
    size: 25,
    font: boldFont,
    color: purple,
    maxWidth: 690,
  });
  page.drawText(`telah menyelesaikan project ${project.title}`, {
    x: 72,
    y: 321,
    size: 14,
    font: regularFont,
    color: deepPurple,
    maxWidth: 690,
  });
  page.drawText(`Organisasi: ${vendor?.organization_name || "Vendor"}`, {
    x: 72,
    y: 282,
    size: 12,
    font: regularFont,
    color: deepPurple,
    maxWidth: 690,
  });
  page.drawText(`Skill yang digunakan: ${skills.length ? skills.join(", ") : "Tidak ditentukan"}`, {
    x: 72,
    y: 251,
    size: 11,
    font: regularFont,
    color: deepPurple,
    maxWidth: 690,
  });
  page.drawText(`Tanggal penyelesaian: ${issuedDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })}`, {
    x: 72,
    y: 219,
    size: 11,
    font: regularFont,
    color: deepPurple,
  });
  page.drawLine({ start: { x: 72, y: 180 }, end: { x: 770, y: 180 }, thickness: 1, color: rgb(0.86, 0.83, 0.91) });
  page.drawText(`Nomor sertifikat: ${certificate.certificate_no}`, {
    x: 72,
    y: 148,
    size: 11,
    font: boldFont,
    color: deepPurple,
  });
  page.drawText(`Verifikasi: ${verifyUrl}`, {
    x: 72,
    y: 122,
    size: 9,
    font: regularFont,
    color: purple,
    maxWidth: 690,
  });

  const bytes = await pdf.save();
  const responseBytes = new Uint8Array(bytes.byteLength);
  responseBytes.set(bytes);
  return new Response(responseBytes.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificate_no}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
