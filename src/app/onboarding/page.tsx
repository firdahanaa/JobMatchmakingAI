"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Briefcase, MapPin, Clock, Building2, Globe, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormItem } from "@/components/ui/form";
import { toast } from "sonner";
import type { UserRole, WorkMode } from "@/types/database";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>("talent");
  const [userId, setUserId] = React.useState<string | null>(null);
  const [fullName, setFullName] = React.useState<string>("");
  const [isPageLoading, setIsPageLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  // Talent state
  const [headline, setHeadline] = React.useState("");
  const [education, setEducation] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [hoursPerWeek, setHoursPerWeek] = React.useState<number>(15);
  const [preferredMode, setPreferredMode] = React.useState<WorkMode>("remote");
  const [bio, setBio] = React.useState("");

  // Vendor state
  const [orgName, setOrgName] = React.useState("");
  const [orgDesc, setOrgDesc] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");
  const [orgWebsite, setOrgWebsite] = React.useState("");

  React.useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        const userRole = (profile?.role || user.user_metadata?.role || "talent") as UserRole;
        setRole(userRole);
        setFullName(profile?.full_name || user.user_metadata?.full_name || "");

        if (userRole === "talent") {
          const { data: talentProf } = await supabase
            .from("talent_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (talentProf) {
            setHeadline(talentProf.headline || "");
            setEducation(talentProf.education || "");
            setLocation(talentProf.location || "");
            setHoursPerWeek(talentProf.hours_per_week || 15);
            setPreferredMode(talentProf.preferred_mode || "remote");
            setBio(talentProf.bio || "");
          }
        } else {
          const { data: vendorProf } = await supabase
            .from("vendor_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (vendorProf) {
            setOrgName(vendorProf.organization_name || profile?.full_name || "");
            setOrgDesc(vendorProf.description || "");
            setOrgLocation(vendorProf.location || "");
            setOrgWebsite(vendorProf.website || "");
          }
        }
      } catch (err) {
        console.error("Onboarding load error:", err);
      } finally {
        setIsPageLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSubmitting(true);
    setErrorText(null);

    try {
      const supabase = createClient();

      // 1. Ensure profile exists in profiles table
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").upsert({
          id: userId,
          role: role,
          full_name: fullName || (role === "talent" ? "Talent" : orgName.trim()),
        });
      }

      if (role === "talent") {
        if (!headline.trim() || !education.trim() || !location.trim() || !hoursPerWeek) {
          setErrorText("Harap lengkapi semua kolom wajib untuk profil Talent.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("talent_profiles")
          .upsert({
            user_id: userId,
            headline: headline.trim(),
            education: education.trim(),
            location: location.trim(),
            hours_per_week: Number(hoursPerWeek),
            preferred_mode: preferredMode,
            bio: bio.trim() || null,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast.success("Profil Talent berhasil dilengkapi!");
        router.push("/talent/dashboard");
      } else {
        if (!orgName.trim() || !orgDesc.trim() || !orgLocation.trim()) {
          setErrorText("Harap lengkapi nama organisasi, deskripsi, dan lokasi.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("vendor_profiles")
          .upsert({
            user_id: userId,
            organization_name: orgName.trim(),
            description: orgDesc.trim(),
            location: orgLocation.trim(),
            website: orgWebsite.trim() || null,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast.success("Profil Vendor berhasil dilengkapi!");
        router.push("/vendor/dashboard");
      }

      router.refresh();
    } catch (err: unknown) {
      console.error("Onboarding submission error:", err);
      const errObj = err as { message?: string; details?: string; hint?: string };
      const baseMsg = errObj?.message || (err instanceof Error ? err.message : "Gagal menyimpan profil.");
      const fullMsg = errObj?.details ? `${baseMsg} (${errObj.details})` : baseMsg;
      setErrorText(fullMsg);
      toast.error(baseMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Memuat profil kamu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-3 shadow-sm shadow-purple-100">
            {role === "talent" ? <User className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Lengkapi Profil {role === "talent" ? "Talent" : "Vendor"}{fullName ? `, ${fullName}` : ""}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {role === "talent"
              ? "Profil ini akan digunakan sistem untuk menghitung Match Score dan mencocokkanmu dengan proyek yang ideal."
              : "Bantu talent mengenal profil organisasi atau bisnis kamu dengan lebih jelas."}
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
          {errorText && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 border border-rose-200 text-sm text-rose-800">
              {errorText}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {role === "talent" ? (
              <>
                <FormItem>
                  <Label htmlFor="headline">
                    Headline Profesional <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="headline"
                      placeholder="mis. Mahasiswa Informatika | Frontend & UI Designer"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Sebutkan keahlian utama atau fokus peran yang kamu cari.
                  </p>
                </FormItem>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormItem>
                    <Label htmlFor="education">
                      Pendidikan / Kampus <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="education"
                      placeholder="mis. S1 Teknik Informatika ITB"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      required
                    />
                  </FormItem>

                  <FormItem>
                    <Label htmlFor="location">
                      Lokasi Domisili <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="location"
                        placeholder="mis. Bandung / Jakarta"
                        className="pl-9"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormItem>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormItem>
                    <Label htmlFor="hoursPerWeek">
                      Ketersediaan Waktu (Jam / Minggu) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="hoursPerWeek"
                        type="number"
                        min={1}
                        max={80}
                        className="pl-9"
                        value={hoursPerWeek}
                        onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                        required
                      />
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormItem>

                  <FormItem>
                    <Label htmlFor="preferredMode">
                      Preferensi Mode Kerja <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      id="preferredMode"
                      value={preferredMode}
                      onChange={(e) => setPreferredMode(e.target.value as WorkMode)}
                    >
                      <option value="remote">Remote (Jarak Jauh)</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite (Di Lokasi)</option>
                    </Select>
                  </FormItem>
                </div>

                <FormItem>
                  <Label htmlFor="bio">Bio Singkat</Label>
                  <Textarea
                    id="bio"
                    placeholder="Ceritakan sedikit tentang minat belajar, pengalaman sebelumnya, atau proyek yang pernah kamu buat..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                </FormItem>
              </>
            ) : (
              <>
                <FormItem>
                  <Label htmlFor="orgName">
                    Nama Organisasi / Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="orgName"
                      placeholder="mis. Kopi Bersama Nusantara / Studio Kreasi"
                      className="pl-9"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </FormItem>

                <FormItem>
                  <Label htmlFor="orgLocation">
                    Lokasi Kantor / Operasional <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="orgLocation"
                      placeholder="mis. Jakarta Selatan / Surabaya"
                      className="pl-9"
                      value={orgLocation}
                      onChange={(e) => setOrgLocation(e.target.value)}
                      required
                    />
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </FormItem>

                <FormItem>
                  <Label htmlFor="orgWebsite">Website / Media Sosial</Label>
                  <div className="relative">
                    <Input
                      id="orgWebsite"
                      type="url"
                      placeholder="https://instagram.com/usaha_anda"
                      className="pl-9"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                    />
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </FormItem>

                <FormItem>
                  <Label htmlFor="orgDesc">
                    Deskripsi Organisasi / Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="orgDesc"
                    placeholder="Jelaskan bidang usaha, visi, atau jenis proyek yang biasa Anda kerjakan bersama talenta..."
                    value={orgDesc}
                    onChange={(e) => setOrgDesc(e.target.value)}
                    rows={4}
                    required
                  />
                </FormItem>
              </>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium"
            >
              Simpan & Masuk ke Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
