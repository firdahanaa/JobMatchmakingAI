"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Search,
  Trash2,
  Layers,
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormItem } from "@/components/ui/form";
import { toast } from "sonner";
import {
  projectSchema,
  type ProjectInput,
} from "@/lib/validators/project";
import type {
  Skill,
  SkillLevel,
  ProjectDifficulty,
  ProjectType,
  WorkMode,
  ProjectStatus,
} from "@/types/database";

export interface SelectedProjectSkillItem {
  skillId: number;
  skillName: string;
  category: string;
  minLevel: SkillLevel;
  isRequired: boolean;
}

interface ProjectFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    difficulty: ProjectDifficulty;
    type: ProjectType;
    mode: WorkMode;
    durationWeeks?: number | null;
    hoursPerWeek?: number | null;
    rewardAmount?: number | null;
    rewardNote?: string | null;
    deadline?: string | null;
    status: ProjectStatus;
    skills: SelectedProjectSkillItem[];
  };
  masterSkills: Skill[];
  onSubmit: (data: ProjectInput) => Promise<{ success: boolean; error: string | null; projectId?: string }>;
  isEdit?: boolean;
}

export function ProjectForm({
  initialData,
  masterSkills,
  onSubmit,
  isEdit = false,
}: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [difficulty, setDifficulty] = React.useState<ProjectDifficulty>(
    initialData?.difficulty || "beginner"
  );
  const [type, setType] = React.useState<ProjectType>(initialData?.type || "freelance");
  const [mode, setMode] = React.useState<WorkMode>(initialData?.mode || "remote");
  const [durationWeeks, setDurationWeeks] = React.useState<string>(
    initialData?.durationWeeks ? String(initialData.durationWeeks) : ""
  );
  const [hoursPerWeek, setHoursPerWeek] = React.useState<string>(
    initialData?.hoursPerWeek ? String(initialData.hoursPerWeek) : "15"
  );
  const [rewardAmount, setRewardAmount] = React.useState<string>(
    initialData?.rewardAmount !== undefined && initialData?.rewardAmount !== null
      ? String(initialData.rewardAmount)
      : ""
  );
  const [rewardNote, setRewardNote] = React.useState(initialData?.rewardNote || "");
  const [deadline, setDeadline] = React.useState(initialData?.deadline || "");
  const [status, setStatus] = React.useState<ProjectStatus>(
    (initialData?.status as ProjectStatus) || "open"
  );

  // Skills state
  const [selectedSkills, setSelectedSkills] = React.useState<SelectedProjectSkillItem[]>(
    initialData?.skills || []
  );

  // Skill search & category state
  const [skillSearch, setSkillSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("Semua");
  const [isSkillPickerOpen, setIsSkillPickerOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsSkillPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Minimum date for deadline: today
  const minDate = React.useMemo(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  // Categories list
  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(masterSkills.map((s) => s.category))).filter(Boolean);
    return ["Semua", ...cats];
  }, [masterSkills]);

  // Available skills not yet added
  const availableSkills = React.useMemo(() => {
    const selectedIds = new Set(selectedSkills.map((s) => s.skillId));
    return masterSkills.filter((s) => {
      if (selectedIds.has(s.id)) return false;
      if (selectedCategory !== "Semua" && s.category !== selectedCategory) return false;
      if (skillSearch.trim()) {
        const q = skillSearch.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [masterSkills, selectedSkills, selectedCategory, skillSearch]);

  // Group available skills
  const groupedSkills = React.useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const skill of availableSkills) {
      if (!map[skill.category]) map[skill.category] = [];
      map[skill.category].push(skill);
    }
    return map;
  }, [availableSkills]);

  // Add skill to project
  const handleAddSkill = (skill: Skill) => {
    setSelectedSkills([
      ...selectedSkills,
      {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        minLevel: "beginner",
        isRequired: true,
      },
    ]);
    setSkillSearch("");
  };

  // Remove skill
  const handleRemoveSkill = (skillId: number) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skillId !== skillId));
  };

  // Update skill level
  const handleSkillLevelChange = (skillId: number, minLevel: SkillLevel) => {
    setSelectedSkills(
      selectedSkills.map((s) => (s.skillId === skillId ? { ...s, minLevel } : s))
    );
  };

  // Toggle skill isRequired
  const handleToggleRequired = (skillId: number) => {
    setSelectedSkills(
      selectedSkills.map((s) =>
        s.skillId === skillId ? { ...s, isRequired: !s.isRequired } : s
      )
    );
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSkills.length === 0) {
      toast.error("Pilih minimal satu skill yang dibutuhkan untuk proyek ini.");
      return;
    }

    const payload: ProjectInput = {
      title: title.trim(),
      description: description.trim(),
      difficulty,
      type,
      mode,
      durationWeeks: durationWeeks ? Number(durationWeeks) : null,
      hoursPerWeek: hoursPerWeek ? Number(hoursPerWeek) : null,
      rewardAmount: rewardAmount ? Number(rewardAmount) : 0,
      rewardNote: rewardNote.trim() || null,
      deadline: deadline || null,
      status: status || "open",
      skills: selectedSkills.map((s) => ({
        skillId: s.skillId,
        minLevel: s.minLevel,
        isRequired: s.isRequired,
      })),
    };

    // Client-side Zod validation
    const validation = projectSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Periksa kembali input form Anda.");
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(validation.data);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        isEdit
          ? "Proyek berhasil diperbarui!"
          : "Proyek baru berhasil diposting!"
      );
      router.push("/vendor/dashboard");
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menyimpan proyek.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top action bar / back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/vendor/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8a7668] hover:text-[#5c4639] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Vendor
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/vendor/dashboard">
            <Button type="button" variant="outline" size="sm">
              Batal
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting}
            size="sm"
            className="bg-[#C98B75] hover:bg-[#b87a65] text-white gap-2 shadow-xs"
          >
            <Save className="h-4 w-4" />
            {isEdit ? "Simpan Perubahan" : "Posting Proyek"}
          </Button>
        </div>
      </div>

      {/* Card 1: Informasi Pokok Proyek */}
      <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#4a3728]">1. Informasi Pokok Proyek</h2>
          <p className="text-xs text-[#8a7668] mt-0.5">
            Jelaskan lingkup pekerjaan yang dibutuhkan organisasi Anda secara detail dan menarik bagi talenta muda.
          </p>
        </div>

        {/* Title */}
        <FormItem>
          <Label htmlFor="title">
            Judul Proyek <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="mis. Desain Poster Promosi Produk UMKM Kuliner atau Redesign Landing Page"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={150}
          />
          <p className="text-xs text-[#a89080]">
            Minimal 5 karakter, maksimal 150 karakter. ({title.length}/150)
          </p>
        </FormItem>

        {/* Description */}
        <FormItem>
          <Label htmlFor="description">
            Deskripsi & Ruang Lingkup Proyek <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="description"
            rows={5}
            placeholder="Tuliskan tujuan proyek, deliverable akhir yang diharapkan, format berkas, serta konteks organisasi Anda..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <p className="text-xs text-[#a89080]">
            Minimal 20 karakter agar pelamar memahami ekspektasi tugas dengan jelas. ({description.length} karakter)
          </p>
        </FormItem>

        {/* Project Difficulty, Type, and Work Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormItem>
            <Label htmlFor="difficulty">
              Tingkat Kesulitan <span className="text-rose-500">*</span>
            </Label>
            <Select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as ProjectDifficulty)}
            >
              <option value="beginner">Pemula (Beginner)</option>
              <option value="intermediate">Menengah (Intermediate)</option>
              <option value="advanced">Mahir (Advanced)</option>
            </Select>
            <p className="text-[11px] text-[#a89080]">Dipakai AI untuk mencocokkan jenjang skill talent.</p>
          </FormItem>

          <FormItem>
            <Label htmlFor="type">
              Tipe Proyek <span className="text-rose-500">*</span>
            </Label>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              <option value="freelance">Freelance (Berbayar / Reward)</option>
              <option value="volunteer">Volunteer (Sukarela / Sertifikat)</option>
            </Select>
          </FormItem>

          <FormItem>
            <Label htmlFor="mode">
              Mode Kerja <span className="text-rose-500">*</span>
            </Label>
            <Select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as WorkMode)}
            >
              <option value="remote">Remote (Jarak Jauh)</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite (Di Lokasi)</option>
            </Select>
          </FormItem>
        </div>
      </div>

      {/* Card 2: Skill yang Dibutuhkan */}
      <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#4a3728]">2. Skill yang Dibutuhkan</h2>
              <Badge
                variant={selectedSkills.length >= 1 ? "success" : "destructive"}
                className="text-xs"
              >
                {selectedSkills.length} Dipilih (Min. 1)
              </Badge>
            </div>
            <p className="text-xs text-[#8a7668] mt-0.5">
              Pilih keahlian dari master list terstandar. Tentukan level minimum dan apakah skill bersifat wajib (Required) atau opsional (Nice to have).
            </p>
          </div>
        </div>

        {/* Searchable Skill Picker */}
        <div ref={pickerRef} className="relative space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Input
                placeholder="Ketik untuk mencari keahlian (mis. Figma, Python, Copywriting, React)..."
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                  setIsSkillPickerOpen(true);
                }}
                onFocus={() => setIsSkillPickerOpen(true)}
                className="pl-9 pr-4 text-sm"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#a89080] pointer-events-none" />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsSkillPickerOpen(true);
                  }}
                  className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#C98B75] text-white shadow-xs"
                      : "bg-[#F7ECEA] text-[#7a6559] hover:bg-[#e8d5d0]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {isSkillPickerOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#e8d5d0] bg-white p-3 shadow-xl space-y-3">
              {availableSkills.length > 0 ? (
                Object.entries(groupedSkills).map(([cat, skills]) => (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#b87a65] bg-[#F7ECEA]/60 rounded">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3 w-3" />
                        {cat}
                      </span>
                      <span className="text-[10px] text-[#a89080] font-normal">
                        {skills.length} keahlian
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {skills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[#F7ECEA] text-[#5c4639] hover:text-[#7a4f3f] cursor-pointer border border-[#F7ECEA] hover:border-[#e0c4bc]"
                        >
                          <span className="font-semibold truncate">{skill.name}</span>
                          <span className="text-[10px] text-[#C98B75] font-medium ml-2 shrink-0">
                            + Tambah
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#8a7668]">
                  {masterSkills.length === 0 ? (
                    <p>Memuat master keahlian...</p>
                  ) : (
                    <p>
                      Tidak ada keahlian yang cocok dalam master list untuk kategori ini.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Skills List */}
        <div className="space-y-3">
          <Label className="font-semibold text-[#5c4639]">
            Daftar Skill Yang Ditambahkan ({selectedSkills.length})
          </Label>

          {selectedSkills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedSkills.map((item) => (
                <div
                  key={item.skillId}
                  className={`rounded-xl border p-4 shadow-xs transition-colors ${
                    item.isRequired
                      ? "border-[#e0c4bc] bg-[#F7ECEA]/30"
                      : "border-[#e8d5d0] bg-[#F7ECEA]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#4a3728] text-sm">
                        {item.skillName}
                      </span>
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                        {item.category}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(item.skillId)}
                      className="text-[#a89080] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Hapus skill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8d5d0]/60">
                    {/* Minimum Level */}
                    <div>
                      <Label className="text-[11px] text-[#8a7668] font-medium">Level Minimal:</Label>
                      <Select
                        value={item.minLevel}
                        onChange={(e) =>
                          handleSkillLevelChange(item.skillId, e.target.value as SkillLevel)
                        }
                        className="h-8 text-xs py-1 mt-1"
                      >
                        <option value="beginner">Pemula (Beginner)</option>
                        <option value="intermediate">Menengah (Intermediate)</option>
                        <option value="advanced">Mahir (Advanced)</option>
                      </Select>
                    </div>

                    {/* Is Required Toggle */}
                    <div>
                      <Label className="text-[11px] text-[#8a7668] font-medium">Sifat Skill:</Label>
                      <button
                        type="button"
                        onClick={() => handleToggleRequired(item.skillId)}
                        className={`w-full mt-1 h-8 rounded-lg px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          item.isRequired
                            ? "bg-[#C98B75] text-white shadow-xs"
                            : "bg-[#e8d5d0] text-[#695449] hover:bg-[#d4b0a5]"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.isRequired ? "Wajib (Required)" : "Nilai Tambah (Opsional)"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-rose-300 bg-rose-50/40 p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-rose-900 text-sm">Belum Ada Skill Ditambahkan</h4>
              <p className="text-xs text-rose-600 max-w-sm mx-auto mt-1">
                Proyek harus memiliki minimal satu skill agar AI dapat menghitung Match Score secara akurat bagi para kandidat.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Waktu, Reward & Status */}
      <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#4a3728]">3. Waktu, Kompensasi & Status Publikasi</h2>
          <p className="text-xs text-[#8a7668] mt-0.5">
            Tentukan durasi kerja, estimasi jam mingguan, imbalan, batas pendaftaran, serta visibilitas proyek.
          </p>
        </div>

        {/* Duration & Hours per week */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormItem>
            <Label htmlFor="durationWeeks">Estimasi Durasi (Minggu)</Label>
            <div className="relative">
              <Input
                id="durationWeeks"
                type="number"
                min={1}
                max={52}
                placeholder="mis. 4"
                className="pl-9"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-[#a89080] pointer-events-none" />
            </div>
            <p className="text-xs text-[#a89080]">Total rentang waktu pengerjaan proyek.</p>
          </FormItem>

          <FormItem>
            <Label htmlFor="hoursPerWeek">Beban Waktu (Jam / Minggu)</Label>
            <div className="relative">
              <Input
                id="hoursPerWeek"
                type="number"
                min={1}
                max={80}
                placeholder="mis. 15"
                className="pl-9"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
              />
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-[#a89080] pointer-events-none" />
            </div>
            <p className="text-xs text-[#a89080]">
              Digunakan AI untuk mencocokkan ketersediaan waktu talent.
            </p>
          </FormItem>
        </div>

        {/* Reward Amount & Reward Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormItem>
            <Label htmlFor="rewardAmount">Besaran Reward / Kompensasi (Rp)</Label>
            <div className="relative">
              <Input
                id="rewardAmount"
                type="number"
                min={0}
                placeholder="mis. 1500000 (kosongkan jika tanpa uang tunai)"
                className="pl-9"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
              />
              <Coins className="absolute left-3 top-2.5 h-4 w-4 text-[#a89080] pointer-events-none" />
            </div>
            <p className="text-xs text-[#a89080]">Nominal reward tunai (tidak boleh negatif).</p>
          </FormItem>

          <FormItem>
            <Label htmlFor="rewardNote">Catatan Imbalan / Fasilitas Non-Tunai</Label>
            <Input
              id="rewardNote"
              placeholder="mis. Sertifikat Resmi, Portofolio Nyata, Surat Rekomendasi"
              value={rewardNote}
              onChange={(e) => setRewardNote(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-[#a89080]">Sangat menarik bagi talenta pencari pengalaman.</p>
          </FormItem>
        </div>

        {/* Deadline & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormItem>
            <Label htmlFor="deadline">Tenggat Waktu Pendaftaran (Deadline)</Label>
            <div className="relative">
              <Input
                id="deadline"
                type="date"
                min={minDate}
                className="pl-9"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#a89080] pointer-events-none" />
            </div>
            <p className="text-xs text-[#a89080]">
              Tidak boleh di masa lalu. Proyek tidak akan menerima lamaran baru setelah tanggal ini.
            </p>
          </FormItem>

          <FormItem>
            <Label htmlFor="status">Status Proyek <span className="text-rose-500">*</span></Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              <option value="open">Open (Langsung Terbuka & Menerima Lamaran)</option>
              <option value="draft">Draft (Simpan Sementara, Belum Ditampilkan)</option>
              {isEdit && (
                <>
                  <option value="completed">Completed (Tandai Selesai)</option>
                  <option value="closed">Closed (Tutup Pendaftaran)</option>
                </>
              )}
            </Select>
            <p className="text-xs text-[#a89080]">
              Pilih Draft jika masih ingin menyempurnakan rincian sebelum dipublikasikan.
            </p>
          </FormItem>
        </div>
      </div>

      {/* Footer Submit Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e8d5d0]">
        <Link href="/vendor/dashboard" className="w-full sm:w-auto">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Batal
          </Button>
        </Link>

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="bg-[#C98B75] hover:bg-[#b87a65] text-white gap-2 w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          {isEdit ? "Simpan Perubahan Proyek" : "Posting Proyek Sekarang"}
        </Button>
      </div>
    </form>
  );
}
