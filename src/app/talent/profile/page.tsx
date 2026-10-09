"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormItem } from "@/components/ui/form";
import { PortfolioInput } from "@/components/talent/portfolio-input";
import { SkillSelector, type SelectedSkillItem } from "@/components/talent/skill-selector";
import { TalentPageNavigation } from "@/components/talent/talent-page-navigation";
import {
  getTalentProfileData,
  updateTalentProfile,
  updateTalentSkills,
  type TalentProfilePageData,
} from "./actions";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";
import {
  User,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Save,
  HelpCircle,
  ArrowRight,
  AlertTriangle,
  Star,
  Building2,
  MessageSquare,
} from "lucide-react";
import type { WorkMode, SkillLevel } from "@/types/database";

export default function TalentProfilePage() {
  const [pageData, setPageData] = React.useState<TalentProfilePageData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isSavingSkills, setIsSavingSkills] = React.useState(false);
  const [isSavingAll, setIsSavingAll] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("info");

  // Profile Form state
  const [headline, setHeadline] = React.useState("");
  const [education, setEducation] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [hoursPerWeek, setHoursPerWeek] = React.useState<number>(15);
  const [preferredMode, setPreferredMode] = React.useState<WorkMode>("remote");
  const [isAvailable, setIsAvailable] = React.useState<boolean>(true);
  const [bio, setBio] = React.useState("");
  const [portfolioUrls, setPortfolioUrls] = React.useState<string[]>([]);

  // Selected Skills state
  const [selectedSkills, setSelectedSkills] = React.useState<SelectedSkillItem[]>([]);

  // Load profile data on mount
  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getTalentProfileData();
      if (res.data) {
        setPageData(res.data);
        const tp = res.data.talentProfile;
        if (tp) {
          setHeadline(tp.headline || "");
          setEducation(tp.education || "");
          setLocation(tp.location || "");
          setHoursPerWeek(tp.hours_per_week ?? 15);
          setPreferredMode((tp.preferred_mode as WorkMode) || "remote");
          setIsAvailable(tp.is_available ?? true);
          setBio(tp.bio || "");
          setPortfolioUrls(tp.portfolio_urls || []);
        }

        const initialSkills: SelectedSkillItem[] = res.data.talentSkills.map((ts) => ({
          skillId: ts.skill_id,
          skillName: ts.skill?.name || `Skill #${ts.skill_id}`,
          category: ts.skill?.category || "Lainnya",
          level: (ts.level as SkillLevel) || "beginner",
        }));
        setSelectedSkills(initialSkills);
      } else if (res.error) {
        toast.error(res.error);
      }
      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Calculate profile completeness score (0 - 100%)
  const calculateCompleteness = () => {
    let score = 0;
    if (headline.trim().length >= 3) score += 15;
    if (education.trim().length >= 2) score += 15;
    if (location.trim().length >= 2) score += 15;
    if (hoursPerWeek > 0) score += 10;
    if (preferredMode) score += 10;
    if (bio.trim().length >= 10) score += 10;
    if (portfolioUrls.length > 0) score += 10;

    // Skills completeness (min 3 skills = 15%)
    if (selectedSkills.length >= 3) {
      score += 15;
    } else if (selectedSkills.length === 2) {
      score += 10;
    } else if (selectedSkills.length === 1) {
      score += 5;
    }

    return Math.min(100, score);
  };

  const completeness = calculateCompleteness();

  // Save profile information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    const result = await updateTalentProfile({
      headline: headline.trim(),
      bio: bio.trim() || null,
      education: education.trim(),
      location: location.trim(),
      hoursPerWeek: Number(hoursPerWeek),
      preferredMode,
      isAvailable,
      portfolioUrls,
    });

    if (result.success) {
      toast.success("Informasi profil berhasil diperbarui!");
    } else {
      toast.error(result.error || "Gagal memperbarui profil.");
    }

    setIsSavingProfile(false);
  };

  // Save skills
  const handleSaveSkills = async () => {
    setIsSavingSkills(true);

    const result = await updateTalentSkills({
      skills: selectedSkills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
      })),
    });

    if (result.success) {
      toast.success("Daftar keahlian berhasil diperbarui!");
    } else {
      toast.error(result.error || "Gagal memperbarui keahlian.");
    }

    setIsSavingSkills(false);
  };

  // Save both profile & skills concurrently
  const handleSaveAll = async () => {
    setIsSavingAll(true);
    let hasError = false;

    const profileRes = await updateTalentProfile({
      headline: headline.trim(),
      bio: bio.trim() || null,
      education: education.trim(),
      location: location.trim(),
      hoursPerWeek: Number(hoursPerWeek),
      preferredMode,
      isAvailable,
      portfolioUrls,
    });

    if (!profileRes.success) {
      toast.error(profileRes.error || "Gagal menyimpan informasi profil.");
      hasError = true;
    }

    const skillsRes = await updateTalentSkills({
      skills: selectedSkills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
      })),
    });

    if (!skillsRes.success) {
      toast.error(skillsRes.error || "Gagal menyimpan keahlian.");
      hasError = true;
    }

    if (!hasError) {
      toast.success("Seluruh data profil dan keahlian berhasil disimpan!");
    }

    setIsSavingAll(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F2A5E]">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3B82F6] border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-[#4A7AAF]">Memuat profil talent...</p>
        </div>
      </div>
    );
  }

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
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Profil Talenta
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-4xl md:text-5xl">
                    Profil &amp; Keahlian Saya
                  </h1>
                  <Badge
                    variant="default"
                    className="border-0 bg-sky-100 px-2.5 py-0.5 text-2xs font-extrabold text-sky-800"
                  >
                    Talent
                  </Badge>
                </div>

                <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                  Kelola informasi pribadi, ketersediaan proyek, dan keahlian untuk memaksimalkan Match Score.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sky-100 pt-5">
                <TalentPageNavigation activePage="profile" />

                <div className="flex flex-wrap items-center gap-3">
                  {pageData?.user && (
                    <div className="hidden text-right sm:block">
                      <p className="text-xs font-medium text-slate-500">Terdaftar sebagai:</p>
                      <p className="text-sm font-bold text-[#0F172A]">{pageData.user.fullName}</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveAll}
                    isLoading={isSavingAll}
                    className="gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5 hover:from-sky-700 hover:to-blue-700"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Semua
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Unauthenticated Alert Banner */}
          {!pageData?.user && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Kamu sedang melihat pratinjau halaman profil. Masuk ke akun talent untuk menyimpan perubahan ke database.
                </span>
              </div>
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0">
                  Masuk Sekarang
                </Button>
              </Link>
            </div>
          )}

          {/* Completeness Card */}
          <div
            className="rounded-3xl p-5 sm:p-6 shadow-xl transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(186, 230, 253, 0.7)",
              boxShadow: "0 10px 30px -10px rgba(2, 136, 209, 0.08)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="font-black text-[#0F172A] text-base uppercase tracking-tight">Kelengkapan Profil</h2>
                <Badge
                  variant={completeness >= 85 ? "success" : "default"}
                  className="text-2xs font-extrabold px-2 py-0.5 ml-1"
                >
                  {completeness}% Lengkap
                </Badge>
              </div>

              <span className="text-xs text-slate-500 font-medium bg-white/50 px-3 py-1 rounded-full border border-sky-100/50">
                {completeness >= 100
                  ? "Profil kamu sudah terisi sempurna!"
                  : "Lengkapi seluruh bagian untuk meningkatkan daya tarik di mata vendor."}
              </span>
            </div>

            <Progress
              value={completeness}
              className="h-3 bg-sky-100/50 rounded-full"
              indicatorClassName={completeness >= 85 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-sky-400 to-blue-500"}
            />

            {/* Checklist items */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2 bg-white/40 px-3 py-2 rounded-xl border border-sky-100/30">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    headline.trim() && education.trim() && location.trim()
                      ? "text-emerald-500"
                      : "text-sky-300"
                  }`}
                />
                <span>Data Dasar</span>
              </div>

              <div className="flex items-center gap-2 bg-white/40 px-3 py-2 rounded-xl border border-sky-100/30">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    hoursPerWeek > 0 && preferredMode ? "text-emerald-500" : "text-sky-300"
                  }`}
                />
                <span>Ketersediaan</span>
              </div>

              <div className="flex items-center gap-2 bg-white/40 px-3 py-2 rounded-xl border border-sky-100/30">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${portfolioUrls.length > 0 ? "text-emerald-500" : "text-sky-300"}`}
                />
                <span>Portofolio ({portfolioUrls.length})</span>
              </div>

              <div className="flex items-center gap-2 bg-white/40 px-3 py-2 rounded-xl border border-sky-100/30">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${selectedSkills.length >= 3 ? "text-emerald-500" : "text-sky-300"}`}
                />
                <span>Skill ({selectedSkills.length}/3 min.)</span>
              </div>
            </div>
          </div>

          {/* Main Tabs Container */}
          <div
            className="rounded-3xl p-6 sm:p-8 shadow-2xl transition-all text-[#0F172A]"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(186, 230, 253, 0.9)",
              boxShadow: "0 25px 50px -12px rgba(2, 136, 209, 0.1)",
            }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-lg bg-sky-50/80 rounded-2xl p-1 border border-sky-100">
                <TabsTrigger value="info" className="gap-2 font-bold text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-sm">
                  <User className="h-4 w-4" />
                  <span>Informasi</span>
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-2 font-bold text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Skill ({selectedSkills.length})</span>
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-2 font-bold text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-sm">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>Ulasan ({pageData?.reviews.length ?? 0})</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Info & Availability */}
              <TabsContent value="info">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Headline */}
                  <FormItem>
                    <Label htmlFor="headline">
                      Headline Profesional <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="headline"
                      placeholder="mis. Mahasiswa Informatika | Frontend Developer (Next.js & React)"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      required
                    />
                    <p className="text-xs text-[#4A7AAF]">
                      Rangkum peran dan fokus keahlian kamu dalam satu kalimat singkat.
                    </p>
                  </FormItem>

                  {/* Education & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem>
                      <Label htmlFor="education">
                        Pendidikan / Institusi <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="education"
                        placeholder="mis. S1 Teknik Informatika - ITB"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        required
                      />
                    </FormItem>

                    <FormItem>
                      <Label htmlFor="location">
                        Domisili / Kota <span className="text-rose-500">*</span>
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
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[#93C5FD] pointer-events-none" />
                      </div>
                    </FormItem>
                  </div>

                  {/* Availability Hours & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem>
                      <Label htmlFor="hoursPerWeek">
                        Waktu Tersedia (Jam / Minggu) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="hoursPerWeek"
                          type="number"
                          min={0}
                          max={80}
                          className="pl-9"
                          value={hoursPerWeek}
                          onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                          required
                        />
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-[#93C5FD] pointer-events-none" />
                      </div>
                      <p className="text-xs text-[#4A7AAF]">
                        Dipakai sistem untuk menghitung skor ketersediaan waktu.
                      </p>
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

                  {/* Availability Toggle */}
                  <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="availabilityToggle" className="font-semibold text-[#0F2A5E] cursor-pointer">
                          Status Ketersediaan Menerima Proyek
                        </Label>
                        <p className="text-xs text-[#4A7AAF]">
                          Jika dimatikan, profilmu akan ditandai sedang tidak membuka tawaran baru.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="availabilityToggle"
                        role="switch"
                        aria-checked={isAvailable}
                        onClick={() => setIsAvailable(!isAvailable)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 ${
                          isAvailable ? "bg-gradient-to-r from-[#2563EB] to-[#60A5FA]" : "bg-[#BFDBFE]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isAvailable ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bio */}
                  <FormItem>
                    <Label htmlFor="bio">Bio &amp; Ringkasan Diri</Label>
                    <Textarea
                      id="bio"
                      placeholder="Ceritakan latar belakangmu, ketertarikan proyek yang ingin kamu kerjakan, dan hal yang sedang kamu pelajari..."
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </FormItem>

                  {/* Portfolio Input Component */}
                  <div className="pt-2 border-t border-[#DBEAFE]">
                    <PortfolioInput
                      urls={portfolioUrls}
                      onChange={(updated) => setPortfolioUrls(updated)}
                    />
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("skills")}
                      className="gap-2 text-[#2563EB] border-[#BFDBFE] hover:bg-[#EFF6FF] w-full sm:w-auto"
                    >
                      Lanjut ke Skill Saya
                      <span aria-hidden="true" className="text-lg font-semibold leading-none">
                        &gt;
                      </span>
                    </Button>

                    <Button
                      type="submit"
                      isLoading={isSavingProfile}
                      className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white hover:from-[#1E40AF] hover:to-[#1D4ED8] gap-2 w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4" />
                      Simpan Informasi Profil
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Tab 2: Skills Management */}
              <TabsContent value="skills" className="space-y-4">
                <div className="rounded-xl bg-[#EFF6FF] p-4 border border-[#BFDBFE] flex items-start gap-3 text-xs text-[#1D4ED8] leading-relaxed">
                  <HelpCircle className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Aturan Keahlian Terstandar:</span> Keahlian harus dipilih dari
                    master list terstandar agar algoritma AI dapat mencocokkan profilmu dengan proyek vendor secara
                    akurat. Kamu bisa menentukan level keahlian (Beginner, Intermediate, Advanced) untuk tiap skill.
                  </div>
                </div>

                <SkillSelector
                  masterSkills={pageData?.masterSkills || []}
                  selectedSkills={selectedSkills}
                  onChange={(updated) => setSelectedSkills(updated)}
                  onSave={handleSaveSkills}
                  isSaving={isSavingSkills}
                />

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("info")}
                    className="gap-1.5 text-xs text-[#4A7AAF] hover:text-[#0F2A5E] hover:bg-[#EFF6FF]"
                  >
                    ← Kembali ke Informasi &amp; Ketersediaan
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 3: Reviews & Reputation */}
              <TabsContent value="reviews" className="space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Rating Average */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-900">Rating Rata-rata</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-800">
                        {pageData?.ratingStats.avgRating != null
                          ? pageData.ratingStats.avgRating.toFixed(1)
                          : "Belum Ada"}
                      </span>
                      {pageData?.ratingStats.avgRating != null && (
                        <span className="text-xs text-amber-600">/ 5.0</span>
                      )}
                    </div>
                    <StarRating
                      value={pageData?.ratingStats.avgRating ?? 0}
                      readOnly
                      size="sm"
                    />
                  </div>

                  {/* Completed Projects */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-900">Proyek Selesai</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      {pageData?.ratingStats.completedProjectsCount ?? 0}
                    </p>
                    <p className="text-2xs text-emerald-600">Terselesaikan secara sukses</p>
                  </div>

                  {/* Total Reviews */}
                  <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-1.5">
                    <p className="text-xs font-semibold text-[#1D4ED8]">Total Ulasan</p>
                    <p className="text-2xl font-bold text-[#0F2A5E]">
                      {pageData?.ratingStats.reviewCount ?? 0}
                    </p>
                    <p className="text-2xs text-[#4A7AAF]">Ulasan resmi dari vendor</p>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-2">
                    <h3 className="text-sm font-bold text-[#0F2A5E] flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#2563EB]" />
                      <span>Ulasan yang Diterima</span>
                    </h3>
                    <Badge variant="outline" className="text-2xs font-semibold text-[#1D4ED8] border-[#BFDBFE]">
                      {pageData?.reviews.length ?? 0} Ulasan
                    </Badge>
                  </div>

                  {pageData?.reviews && pageData.reviews.length > 0 ? (
                    <div className="space-y-3.5">
                      {pageData.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-2xl border border-[#BFDBFE] bg-white hover:bg-[#F0F9FF] transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DBEAFE] pb-2.5">
                            <div>
                              <p className="text-xs font-bold text-[#0F2A5E] flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-[#2563EB]" />
                                <span>{rev.vendorName}</span>
                              </p>
                              <p className="text-2xs text-[#4A7AAF] mt-0.5">
                                Proyek: &ldquo;{rev.projectTitle}&rdquo;
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <StarRating value={rev.rating} readOnly size="sm" showValue />
                              <span className="text-2xs text-[#4A7AAF]">
                                • {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Specific criteria ratings (Quality, Timeliness, Communication) */}
                          {(rev.quality || rev.timeliness || rev.communication) && (
                            <div className="flex flex-wrap gap-3 text-2xs text-[#4A7AAF] py-1">
                              {rev.quality && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                                  <span>Kualitas:</span>
                                  <StarRating value={rev.quality} readOnly size="sm" />
                                </div>
                              )}
                              {rev.timeliness && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                                  <span>Ketepatan Waktu:</span>
                                  <StarRating value={rev.timeliness} readOnly size="sm" />
                                </div>
                              )}
                              {rev.communication && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                                  <span>Komunikasi:</span>
                                  <StarRating value={rev.communication} readOnly size="sm" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Written Comment */}
                          {rev.comment && (
                            <div className="p-3 rounded-xl bg-[#F0F9FF] border border-[#DBEAFE] text-xs text-[#4A7AAF] italic leading-relaxed">
                              &ldquo;{rev.comment}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F0F9FF] space-y-2">
                      <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Star className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-[#0F2A5E]">
                        Belum Ada Ulasan Diterima
                      </p>
                      <p className="text-2xs text-[#4A7AAF] max-w-sm mx-auto leading-relaxed">
                        Selesaikan proyek pertamamu untuk mulai mengumpulkan bintang dan testimoni profesional dari vendor!
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
