"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, CircleUser, ClipboardList, House, PlusCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { UserRole } from "@/types/database";

interface NavbarProps {
  initialUser?: {
    id: string;
    email?: string;
    fullName?: string;
    role?: UserRole;
  } | null;
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState(initialUser ?? null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (initialUser !== undefined) return;

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
        if (!authUser) {
          setUser(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email,
          fullName: profile?.full_name || authUser.user_metadata?.full_name || "Pengguna",
          role: (profile?.role || authUser.user_metadata?.role || "talent") as UserRole,
        });
      });
    } catch {
      // Env variables might not be set yet during development
    }
  }, [initialUser]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Berhasil keluar.");
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error("Gagal keluar. Silakan coba lagi.");
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isTalent = user?.role === "talent";
  const isVendor = user?.role === "vendor";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-[#c9dce7]/90 backdrop-blur-xl shadow-xs shadow-slate-400/10">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          href={user ? (isTalent ? "/talent/dashboard" : "/vendor/dashboard") : "/"}
          className="flex items-center gap-2.5 font-black text-lg text-[#0F172A] group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="tracking-tight text-[#0F172A]">
            Path<span className="text-sky-600">folio</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
          {user && isTalent && (
            <>
              <Link
                href="/talent/dashboard"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                  pathname.startsWith("/talent/dashboard")
                    ? "bg-sky-50 text-sky-700 border border-sky-200/80 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <House className="h-4 w-4 text-sky-600" />
                Dashboard
              </Link>
              <Link
                href="/talent/projects"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                  pathname.startsWith("/talent/projects")
                    ? "bg-sky-50 text-sky-700 border border-sky-200/80 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <Search className="h-4 w-4 text-sky-600" />
                Jelajahi Proyek
              </Link>
              <Link
                href="/talent/applications"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                  pathname.startsWith("/talent/applications")
                    ? "bg-sky-50 text-sky-700 border border-sky-200/80 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <ClipboardList className="h-4 w-4 text-sky-700" />
                Lamaran Saya
              </Link>
              <Link
                href="/talent/profile"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                  pathname.startsWith("/talent/profile")
                    ? "bg-sky-50 text-sky-700 border border-sky-200/80 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/60"
                }`}
              >
                <CircleUser className="h-4 w-4 text-sky-700" />
                Profil Saya
              </Link>
            </>
          )}

          {user && isVendor && !pathname.startsWith("/vendor/dashboard") && (
            <Link
              href="/vendor/projects/new"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                pathname.startsWith("/vendor/projects/new")
                  ? "bg-sky-50 text-sky-700 border border-sky-200/80 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/60"
              }`}
            >
              <PlusCircle className="h-4 w-4 text-sky-600" />
              Posting Proyek
            </Link>
          )}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 hover:ring-2 hover:ring-sky-300 transition-all focus:outline-none cursor-pointer">
                <Avatar
                  fallback={user.fullName || user.email || "U"}
                  className="h-9 w-9 bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold ring-2 ring-sky-100"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="right" className="w-56 bg-white border-sky-100 text-[#0F172A] shadow-xl rounded-2xl">
                <DropdownMenuLabel className="border-b border-sky-100 pb-2.5">
                  <p className="font-bold text-[#0F172A] truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-500 font-normal truncate">{user.email}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full">
                    {user.role === "talent" ? "Talenta" : "Vendor"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-sky-100" />
                {isTalent && (
                  <DropdownMenuItem onClick={() => router.push("/talent/profile")} className="focus:bg-sky-50 focus:text-sky-800 cursor-pointer rounded-xl">
                    <CircleUser className="h-4 w-4 text-sky-700" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                )}
                {isVendor && (
                  <DropdownMenuItem onClick={() => router.push("/vendor/profile")} className="focus:bg-sky-50 focus:text-sky-800 cursor-pointer rounded-xl">
                    <CircleUser className="h-4 w-4 text-sky-700" />
                    <span>Profil Vendor</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-sky-100" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Keluar..." : "Keluar"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-sky-700 hover:bg-sky-50">
                  Masuk
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold shadow-md shadow-sky-500/25 rounded-xl">
                  Daftar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
