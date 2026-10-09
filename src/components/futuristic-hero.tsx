"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Search,
  MessageSquare,
  User,
  FileText,
  LogOut,
  Sparkles,
  PlusCircle,
  ArrowUpRight,
  MapPin,
  Clock,
  Heart,
  Bookmark,
  Share2,
  TrendingUp,
  Briefcase,
  ChevronDown,
  Target,
  Check,
} from "lucide-react";

interface FuturisticHeroDashboardProps {
  userRole?: "talent" | "vendor" | null;
  topProject?: {
    id: string;
    title: string;
    orgName: string;
    location: string;
    stipend: string;
    duration: string;
    matchScore: number;
    description: string;
    workMode: string;
  } | null;
  stats?: {
    totalProjects: number;
    activeApplications: number;
    avgMatch: number;
  };
}

const LOCATION_OPTIONS = [
  "Semua Kota",
  "Jakarta",
  "Surabaya",
  "Bandung",
  "Medan",
  "Semarang",
  "Makassar",
  "Palembang",
  "Yogyakarta",
  "Denpasar (Bali)",
  "Batam",
  "Malang",
  "Balikpapan",
  "Manado",
  "Remote (Semua Kota)",
];

const FIELD_OPTIONS = [
  "Semua Bidang",
  "KOL / Influencer",
  "Web Developer",
  "UI/UX Designer",
  "Graphic Designer",
  "Video Editor",
  "Content Creator",
  "Copy Writer",
  "Data Analyst",
  "Photographer",
];

const MATCH_OPTIONS = ["Semua", "50%+", "60%+", "70%+", "80%+", "90%+"];

function FilterDropdown({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="group flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-all hover:bg-sky-50/80"
        style={{
          borderRadius: "0.875rem",
          background: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(186,230,253,0.7)",
        }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-sky-500" />
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase leading-none tracking-wider text-slate-400">{label}</p>
          <p className="text-xs font-black leading-tight text-slate-700">{value}</p>
        </div>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-sky-500" : "group-hover:text-sky-500"}`}
        />
      </button>

      {open && (
        <div
          className="custom-scrollbar absolute left-0 top-full z-50 mt-2 max-h-60 min-w-[170px] overflow-y-auto shadow-2xl"
          style={{
            borderRadius: "1rem",
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(186,230,253,0.8)",
            boxShadow: "0 20px 60px -10px rgba(2,136,209,0.22), 0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-sky-50"
              style={{ color: option === value ? "#0284c7" : "#374151" }}
            >
              <span>{option}</span>
              {option === value && <Check className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FuturisticHeroDashboard({
  userRole = "talent",
  topProject,
  stats = { totalProjects: 1240, activeApplications: 12, avgMatch: 94 },
}: FuturisticHeroDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"freelance" | "volunteer">("freelance");
  const [isLiked, setIsLiked] = React.useState(false);
  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(428);
  const [activeIcon, setActiveIcon] = React.useState(0);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [location, setLocation] = React.useState("Bandung");
  const [field, setField] = React.useState("Semua Bidang");
  const [minMatch, setMinMatch] = React.useState("70%+");

  const sampleProject = topProject || {
    id: "sample-1",
    title: "Lunar Oasis — Platform AI Matchmaking",
    orgName: "Nusantara Tech Ventures",
    location: "Bandung (Remote)",
    stipend: "Rp 3.500.000",
    duration: "4 Minggu · 15 jam/mgg",
    matchScore: 96,
    description:
      "Arsitektur UI/UX futuristik & integrasi algoritma matchmaking kecocokan talenta otomatis berbasis skill gap analitik presisi.",
    workMode: "Remote",
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Berhasil keluar.");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Gagal keluar. Silakan coba lagi.");
      console.error(error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Sidebar — role-specific shortcuts and account actions
  const sidebarItems = userRole === "vendor"
    ? [
        { icon: Home, label: "Dashboard", href: "/vendor/dashboard" },
        { icon: User, label: "Profil Vendor", href: "/vendor/profile" },
      ]
    : [
        { icon: Home, label: "Dashboard", href: "/talent/dashboard" },
        { icon: Search, label: "Jelajahi Proyek", href: "/talent/projects" },
        { icon: MessageSquare, label: "Pesan", href: "/talent/dashboard" },
        { icon: User, label: "Profil", href: "/talent/profile" },
        { icon: FileText, label: "Lamaran Saya", href: "/talent/applications" },
      ];

  return (
    <div className="relative w-full py-1 px-1 sm:py-2 sm:px-2">
      {/* Outer ambient glow */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-sky-300/25 via-blue-200/15 to-indigo-300/20 blur-3xl rounded-[4rem] pointer-events-none" />

      {/* ── MAIN HERO CONTAINER ── */}
      <div
        className="relative w-full overflow-hidden shadow-2xl shadow-sky-400/25"
        style={{ borderRadius: "2rem" }}
      >
        {/* ═══════════════════════════════════════
            CINEMATIC BACKGROUND LAYERS
        ═══════════════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(175deg, #315a73 0%, #537c93 18%, #769bad 38%, #9fb9c7 58%, #c9dce7 78%, #e3eaeb 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 60% 90%, rgba(255,255,255,0.55) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(15,23,42,0.34) 0%, rgba(15,23,42,0.12) 34%, transparent 58%)",
            }}
          />
          <div
            className="absolute right-0 bottom-0 w-[62%] h-[80%]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(179,229,252,0.35) 40%, rgba(129,212,250,0.25) 70%, transparent 100%)",
              borderRadius: "50% 0 0 0",
            }}
          />
          <div
            className="absolute bottom-6 right-12 w-[45%] h-[72%]"
            style={{
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.22) 0%, rgba(200,230,255,0.28) 50%, rgba(144,202,249,0.15) 100%)",
              backdropFilter: "blur(2px)",
              borderRadius: "3rem 3rem 2rem 2rem",
              border: "1px solid rgba(255,255,255,0.35)",
              boxShadow: "0 30px 80px -20px rgba(25,118,210,0.30)",
            }}
          />
          <div
            className="absolute bottom-16 right-24 w-[30%] h-[55%]"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(227,242,253,0.20) 100%)",
              backdropFilter: "blur(4px)",
              borderRadius: "2.5rem 2.5rem 1.5rem 1.5rem",
              border: "1px solid rgba(255,255,255,0.45)",
            }}
          />
          <div className="absolute bottom-32 right-32 grid grid-cols-3 gap-3 opacity-40">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-white/80"
                style={{ boxShadow: "0 0 6px rgba(255,255,255,0.6)" }}
              />
            ))}
          </div>
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(179,229,252,0.4) 50%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 40px)",
            }}
          />
        </div>

        {userRole === "talent" && (
          <div className="relative z-20 mx-4 mt-4 sm:mx-5 sm:mt-5">
            <div
              className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3"
              style={{
                background: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius: "1.25rem",
                border: "1px solid rgba(255,255,255,0.65)",
                boxShadow: "0 8px 32px -8px rgba(25,118,210,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="flex shrink-0 items-center gap-0.5 p-1"
                style={{
                  background: "rgba(224,242,254,0.8)",
                  borderRadius: "0.875rem",
                  border: "1px solid rgba(186,230,253,0.6)",
                }}
              >
                {(["freelance", "volunteer"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition-all duration-200 ${
                      activeTab === tab ? "text-sky-700" : "text-slate-500 hover:text-sky-600"
                    }`}
                    style={{
                      borderRadius: "0.625rem",
                      background: activeTab === tab ? "rgba(255,255,255,0.95)" : "transparent",
                      boxShadow: activeTab === tab ? "0 1px 4px rgba(2,136,209,0.15)" : "none",
                    }}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {tab === "freelance" ? "Freelance" : "Volunteer"}
                  </button>
                ))}
              </div>

              <div className="hidden h-7 w-px shrink-0 bg-sky-200/70 sm:block" />

              <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
                <FilterDropdown
                  icon={MapPin}
                  label="Lokasi"
                  value={location}
                  options={LOCATION_OPTIONS}
                  onChange={setLocation}
                />
                <FilterDropdown
                  icon={Briefcase}
                  label="Bidang"
                  value={field}
                  options={FIELD_OPTIONS}
                  onChange={setField}
                />
                <FilterDropdown
                  icon={TrendingUp}
                  label="Min. Match"
                  value={minMatch}
                  options={MATCH_OPTIONS}
                  onChange={setMinMatch}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            MAIN CONTENT: SIDEBAR + HEADLINE
        ═══════════════════════════════════════ */}
        <div className="relative z-10 flex min-h-[380px] sm:min-h-[440px] lg:min-h-[480px]">

          {/* LEFT ICON PILL SIDEBAR — no Kategori, no duplicate profile avatar */}
          <div className="relative z-20 flex flex-col items-center gap-2.5 py-7 px-3 sm:px-4">
            {sidebarItems.map((item, idx) => (
              <div key={idx} className="relative h-12 w-12 shrink-0">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={idx === 0 ? "page" : undefined}
                  onClick={() => setActiveIcon(idx)}
                  className={`group absolute left-0 top-0 z-10 inline-flex h-12 items-center justify-start gap-3 overflow-hidden rounded-2xl border px-3 transition-[width,background-color,border-color,box-shadow] duration-300 ease-out hover:z-20 hover:w-44 hover:shadow-lg focus-visible:z-20 focus-visible:w-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 motion-reduce:transition-none ${
                    activeIcon === idx
                      ? "w-12 border-sky-200 bg-white shadow-md shadow-sky-950/15"
                      : "w-12 border-sky-400/70 bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm hover:border-sky-200"
                  }`}
                >
                  <item.icon
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 ${
                      activeIcon === idx ? "text-sky-600" : "text-white"
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`-translate-x-1 whitespace-nowrap text-sm font-bold opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none ${
                      activeIcon === idx ? "text-sky-700" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            ))}
            {userRole !== null && (
              <div className="relative h-12 w-12 shrink-0">
                <button
                  type="button"
                  aria-label="Keluar"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="group absolute left-0 top-0 z-10 inline-flex h-12 w-12 items-center justify-start gap-3 overflow-hidden rounded-2xl border border-sky-400/70 bg-gradient-to-br from-sky-500 to-blue-600 px-3 text-white shadow-sm transition-[width,background-color,border-color,box-shadow] duration-300 ease-out hover:z-20 hover:w-44 hover:border-sky-200 hover:shadow-lg focus-visible:z-20 focus-visible:w-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
                >
                  <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
                  <span className="-translate-x-1 whitespace-nowrap text-sm font-bold opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    {isLoggingOut ? "Keluar..." : "Keluar"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* CENTER HEADLINE */}
          <div className="flex-1 flex flex-col justify-center px-2 sm:px-4 lg:px-6 py-8">
            <div className="max-w-lg">
              {/* Eyebrow badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 mb-5"
                style={{
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.40)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">
                  AI Matchmaking Engine v2.0
                </span>
              </div>

              {/* Main headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.04] tracking-tight mb-5"
                style={{ textShadow: "0 2px 24px rgba(13,71,161,0.35)" }}
              >
                New Way Of
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #ffffff 0%, #b3e5fc 50%, #81d4fa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Career Matching
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/75 max-w-sm leading-relaxed font-medium mb-7">
                Temukan proyek freelance & volunteer dengan kecocokan skill AI transparan, skor 0–100 real-time, dan panduan skill gap presisi.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {userRole === "vendor" && (
                  <Link href="/vendor/projects/new">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-6 py-3 text-sky-700 font-black text-sm hover:scale-105 transition-all duration-300"
                      style={{
                        borderRadius: "1rem",
                        background: "rgba(255,255,255,0.97)",
                        boxShadow: "0 10px 40px rgba(13,71,161,0.25), 0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Buat Proyek Baru
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            BOTTOM FLOATING GLASS CARDS
        ═══════════════════════════════════════ */}
        {userRole === "talent" && (
          <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-end gap-4 px-4 pb-5 sm:px-5 sm:pb-6 -mt-2">
            <div
            className="animate-float w-full sm:w-[260px] shrink-0 p-5 space-y-3"
            style={{
              borderRadius: "1.5rem",
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.65)",
              boxShadow: "0 24px 64px -12px rgba(13,71,161,0.22), 0 4px 16px rgba(0,0,0,0.07)",
            }}
          >
            <div>
              <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-0.5">
                Temukan Proyek Impian
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Platform menghubungkan kamu dengan proyek berkualitas. Mulai perjalanan kariermu sekarang.
              </p>
              </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-black text-[#0F172A] tracking-tighter leading-none">
                  {stats.totalProjects >= 1000
                    ? `${(stats.totalProjects / 1000).toFixed(0)}K+`
                    : `${stats.totalProjects}+`}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Proyek Aktif
                </p>
              </div>

              <div className="flex items-center -space-x-2">
                {["🧑‍💻", "👩‍🎨", "🧑‍🔬"].map((emoji, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-base shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #e1f5fe, #b3e5fc)",
                      border: "2px solid white",
                    }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* SPACER */}
          <div className="hidden sm:flex flex-1" />

          {/* BOTTOM-RIGHT CARD: Top Project Detail */}
          <div
            className="animate-float-delayed w-full sm:w-[310px] shrink-0 p-5 space-y-3"
            style={{
              borderRadius: "1.5rem",
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.65)",
              boxShadow: "0 24px 64px -12px rgba(13,71,161,0.22), 0 4px 16px rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold text-sky-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  {sampleProject.location}
                </p>
                <h3 className="text-sm font-black text-[#0F172A] leading-snug line-clamp-2">
                  {sampleProject.title}
                </h3>
              </div>
              <div
                className="shrink-0 h-11 w-11 flex items-center justify-center text-white text-xs font-black shadow-md"
                style={{
                  borderRadius: "0.875rem",
                  background: "linear-gradient(135deg, #66879b, #506c83)",
                }}
              >
                {sampleProject.matchScore}%
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
              {sampleProject.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span
                className="text-[10px] font-bold text-sky-600 px-2.5 py-1"
                style={{
                  borderRadius: "999px",
                  background: "rgba(224,242,254,0.9)",
                  border: "1px solid rgba(186,230,253,0.8)",
                }}
              >
                🖥 {sampleProject.workMode}
              </span>
              <span
                className="text-[10px] font-bold text-emerald-700 px-2.5 py-1"
                style={{
                  borderRadius: "999px",
                  background: "rgba(236,253,245,0.9)",
                  border: "1px solid rgba(167,243,208,0.8)",
                }}
              >
                <Target className="inline h-3 w-3 mr-0.5" />
                AI Match
              </span>
            </div>

            <div
              className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-2"
              style={{ borderTop: "1px solid rgba(186,230,253,0.5)" }}
            >
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-sky-400" />
                {sampleProject.duration}
              </span>
              <span className="font-black text-[#0F172A] text-xs">
                💰 {sampleProject.stipend}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${
                    isLiked ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-500" : ""}`} />
                  {likesCount}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`transition-colors ${isBookmarked ? "text-sky-600" : "text-slate-400 hover:text-sky-600"}`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-sky-600" : ""}`} />
                </button>
                <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <div
                  className="h-6 w-6 flex items-center justify-center text-white text-[10px] font-black shadow-sm"
                  style={{
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, #0288d1, #1976d2)",
                  }}
                >
                  {sampleProject.orgName.charAt(0)}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[90px]">
                  {sampleProject.orgName}
                </span>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
