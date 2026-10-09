"use client";

import * as React from "react";
import { Search, Trash2, Check, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { Skill, SkillLevel } from "@/types/database";

export interface SelectedSkillItem {
  skillId: number;
  skillName: string;
  category: string;
  level: SkillLevel;
}

interface SkillSelectorProps {
  masterSkills: Skill[];
  selectedSkills: SelectedSkillItem[];
  onChange: (skills: SelectedSkillItem[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function SkillSelector({
  masterSkills,
  selectedSkills,
  onChange,
  onSave,
  isSaving,
}: SkillSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("Semua");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamically derive categories from master skills
  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(masterSkills.map((s) => s.category))).filter(Boolean);
    return ["Semua", ...cats];
  }, [masterSkills]);

  // Available skills from master list not yet selected
  const availableSkills = React.useMemo(() => {
    const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
    return masterSkills.filter((s) => {
      if (selectedSkillIdSet.has(s.id)) return false;
      if (selectedCategory !== "Semua" && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [masterSkills, selectedSkills, selectedCategory, searchQuery]);

  // Group available skills by category
  const groupedAvailableSkills = React.useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const skill of availableSkills) {
      if (!map[skill.category]) {
        map[skill.category] = [];
      }
      map[skill.category].push(skill);
    }
    return map;
  }, [availableSkills]);

  const handleAddSkill = (skill: Skill) => {
    const newItem: SelectedSkillItem = {
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category,
      level: "beginner",
    };
    onChange([...selectedSkills, newItem]);
    setSearchQuery("");
  };

  const handleLevelChange = (skillId: number, newLevel: SkillLevel) => {
    onChange(
      selectedSkills.map((item) =>
        item.skillId === skillId ? { ...item, level: newLevel } : item
      )
    );
  };

  const handleRemoveSkill = (skillId: number) => {
    onChange(selectedSkills.filter((item) => item.skillId !== skillId));
  };

  return (
    <div className="space-y-6">
      {/* Search and Picker Section */}
      <div ref={containerRef} className="relative space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Input
              placeholder="Cari keahlian dari master list (mis. Python, Figma, React)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="pl-9 pr-4 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#93C5FD] pointer-events-none" />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setIsDropdownOpen(true);
                }}
                className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-sm"
                    : "bg-[#EFF6FF] text-[#4A7AAF] hover:bg-[#DBEAFE] hover:text-[#1D4ED8]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion Dropdown Panel with Category Grouping */}
        {isDropdownOpen && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#BFDBFE] bg-white p-3 shadow-xl space-y-3">
            {availableSkills.length > 0 ? (
              Object.entries(groupedAvailableSkills).map(([cat, skills]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8] bg-[#EFF6FF] rounded">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3" />
                      {cat}
                    </span>
                    <span className="text-[10px] text-[#4A7AAF] font-normal">
                      {skills.length} keahlian tersedia
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleAddSkill(skill)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[#EFF6FF] text-[#0F2A5E] hover:text-[#1D4ED8] cursor-pointer border border-[#DBEAFE] hover:border-[#93C5FD]"
                      >
                        <span className="font-semibold truncate">{skill.name}</span>
                        <span className="text-[10px] text-[#2563EB] font-medium ml-2 shrink-0">
                          + Tambah
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-[#4A7AAF]">
                {masterSkills.length === 0 ? (
                  <p>Memuat master list keahlian...</p>
                ) : (
                  <p>
                    Tidak ada keahlian yang cocok dalam master list untuk kategori ini.{" "}
                    <span className="block text-[#93C5FD] mt-1">
                      Keahlian harus dipilih dari master list terstandar dan tidak boleh dibuat manual.
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Skills Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0F2A5E]">Keahlian Terpilih</h3>
            <Badge
              variant={selectedSkills.length >= 3 ? "success" : "secondary"}
              className="text-xs"
            >
              {selectedSkills.length} Keahlian {selectedSkills.length < 3 && "(min. 3)"}
            </Badge>
          </div>

          <Button
            type="button"
            onClick={onSave}
            isLoading={isSaving}
            size="sm"
            className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white hover:from-[#1E40AF] hover:to-[#1D4ED8] gap-1.5"
          >
            <Check className="h-4 w-4" />
            Simpan Keahlian
          </Button>
        </div>

        {selectedSkills.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {selectedSkills.map((item) => (
              <div
                key={item.skillId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#BFDBFE] bg-white p-3 shadow-xs hover:border-[#93C5FD] hover:bg-[#F0F9FF] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0F2A5E] text-sm truncate">
                      {item.skillName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#BFDBFE] text-[#2563EB]">
                      {item.category}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-[#4A7AAF] shrink-0">Tingkat:</span>
                    <Select
                      value={item.level}
                      onChange={(e) =>
                        handleLevelChange(item.skillId, e.target.value as SkillLevel)
                      }
                      className="h-8 text-xs py-1"
                    >
                      <option value="beginner">Beginner (Pemula)</option>
                      <option value="intermediate">Intermediate (Menengah)</option>
                      <option value="advanced">Advanced (Mahir)</option>
                    </Select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSkill(item.skillId)}
                  className="rounded-lg p-2 text-[#93C5FD] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title={`Hapus ${item.skillName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#BFDBFE] bg-[#F0F9FF] p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-[#0F2A5E] text-sm">Belum Ada Keahlian Ditambahkan</h4>
            <p className="text-xs text-[#4A7AAF] max-w-sm mx-auto mt-1">
              Cari dan pilih minimal 3 keahlian dari master list di atas untuk mengoptimalkan kecocokan proyekmu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
