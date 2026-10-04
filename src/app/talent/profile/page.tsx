"use client";

import * as React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
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
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">Memuat profil talent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Profil & Keahlian Saya
                </h1>
                <Badge variant="default" className="bg-purple-100 text-purple-700">
                  Talent
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Kelola informasi pribadi, ketersediaan proyek, dan keahlian untuk memaksimalkan Match Score.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {pageData?.user && (
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-slate-500">Terdaftar sebagai:</p>
                  <p className="font-semibold text-slate-900 text-sm">{pageData.user.fullName}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSaveAll}
                isLoading={isSavingAll}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-xs"
              >
                <Save className="h-4 w-4" />
                Simpan Semua
              </Button>
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
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h2 className="font-bold text-slate-900 text-base">Kelengkapan Profil</h2>
                <Badge
                  variant={completeness >= 85 ? "success" : "default"}
                  className="text-xs font-semibold"
                >
                  {completeness}% Lengkap
                </Badge>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {completeness >= 100
                  ? "Profil kamu sudah terisi sempurna!"
                  : "Lengkapi seluruh bagian untuk meningkatkan daya tarik di mata vendor."}
              </span>
            </div>

            <Progress
              value={completeness}
              className="h-2.5 bg-slate-200"
              indicatorClassName={completeness >= 85 ? "bg-emerald-600" : "bg-purple-600"}
            />

            {/* Checklist items */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    headline.trim() && education.trim() && location.trim()
                      ? "text-emerald-600"
                      : "text-slate-300"
                  }`}
                />
                <span>Data Dasar</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    hoursPerWeek > 0 && preferredMode ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                <span>Ketersediaan</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${portfolioUrls.length > 0 ? "text-emerald-600" : "text-slate-300"}`}
                />
                <span>Portofolio ({portfolioUrls.length})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${selectedSkills.length >= 3 ? "text-emerald-600" : "text-slate-300"}`}
                />
                <span>Skill ({selectedSkills.length}/3 min.)</span>
              </div>
            </div>
          </div>

          {/* Main Tabs Container */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="info" className="gap-2">
                  <User className="h-4 w-4" />
                  <span>Informasi</span>
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Skill ({selectedSkills.length})</span>
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-2">
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
                    <p className="text-xs text-slate-500">
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
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
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
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-slate-500">
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
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="availabilityToggle" className="font-semibold text-slate-900 cursor-pointer">
                          Status Ketersediaan Menerima Proyek
                        </Label>
                        <p className="text-xs text-slate-500">
                          Jika dimatikan, profilmu akan ditandai sedang tidak membuka tawaran baru.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="availabilityToggle"
                        role="switch"
                        aria-checked={isAvailable}
                        onClick={() => setIsAvailable(!isAvailable)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
                          isAvailable ? "bg-purple-600" : "bg-slate-300"
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
                    <Label htmlFor="bio">Bio & Ringkasan Diri</Label>
                    <Textarea
                      id="bio"
                      placeholder="Ceritakan latar belakangmu, ketertarikan proyek yang ingin kamu kerjakan, dan hal yang sedang kamu pelajari..."
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </FormItem>

                  {/* Portfolio Input Component */}
                  <div className="pt-2 border-t border-slate-100">
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
                      className="gap-2 text-slate-600 hover:text-purple-600 w-full sm:w-auto"
                    >
                      Lanjut ke Skill Saya
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <Button
                      type="submit"
                      isLoading={isSavingProfile}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2 w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4" />
                      Simpan Informasi Profil
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Tab 2: Skills Management */}
              <TabsContent value="skills" className="space-y-4">
                <div className="rounded-xl bg-purple-50/70 p-4 border border-purple-100 flex items-start gap-3 text-xs text-purple-900 leading-relaxed">
                  <HelpCircle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
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
                    className="gap-1.5 text-xs text-slate-500 hover:text-slate-900"
                  >
                    ← Kembali ke Informasi & Ketersediaan
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 3: Reviews & Reputation */}
              <TabsContent value="reviews" className="space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Rating Average */}
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-900">Rating Rata-rata</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {pageData?.ratingStats.avgRating != null
                          ? pageData.ratingStats.avgRating.toFixed(1)
                          : "Belum Ada"}
                      </span>
                      {pageData?.ratingStats.avgRating != null && (
                        <span className="text-xs text-slate-500">/ 5.0</span>
                      )}
                    </div>
                    <StarRating
                      value={pageData?.ratingStats.avgRating ?? 0}
                      readOnly
                      size="sm"
                    />
                  </div>

                  {/* Completed Projects */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-900">Proyek Selesai</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {pageData?.ratingStats.completedProjectsCount ?? 0}
                    </p>
                    <p className="text-2xs text-slate-500">Terselesaikan secara sukses</p>
                  </div>

                  {/* Total Reviews */}
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                    <p className="text-xs font-semibold text-purple-900">Total Ulasan</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {pageData?.ratingStats.reviewCount ?? 0}
                    </p>
                    <p className="text-2xs text-slate-500">Ulasan resmi dari vendor</p>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <span>Ulasan yang Diterima</span>
                    </h3>
                    <Badge variant="outline" className="text-2xs font-semibold">
                      {pageData?.reviews.length ?? 0} Ulasan
                    </Badge>
                  </div>

                  {pageData?.reviews && pageData.reviews.length > 0 ? (
                    <div className="space-y-3.5">
                      {pageData.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                            <div>
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                                <span>{rev.vendorName}</span>
                              </p>
                              <p className="text-2xs text-slate-500 mt-0.5">
                                Proyek: &ldquo;{rev.projectTitle}&rdquo;
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <StarRating value={rev.rating} readOnly size="sm" showValue />
                              <span className="text-2xs text-slate-400">
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
                            <div className="flex flex-wrap gap-3 text-2xs text-slate-600 py-1">
                              {rev.quality && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                                  <span>Kualitas:</span>
                                  <StarRating value={rev.quality} readOnly size="sm" />
                                </div>
                              )}
                              {rev.timeliness && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                                  <span>Ketepatan Waktu:</span>
                                  <StarRating value={rev.timeliness} readOnly size="sm" />
                                </div>
                              )}
                              {rev.communication && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                                  <span>Komunikasi:</span>
                                  <StarRating value={rev.communication} readOnly size="sm" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Written Comment */}
                          {rev.comment && (
                            <div className="p-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-700 italic leading-relaxed">
                              &ldquo;{rev.comment}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Star className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Belum Ada Ulasan Diterima
                      </p>
                      <p className="text-2xs text-slate-500 max-w-sm mx-auto leading-relaxed">
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
