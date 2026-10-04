"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, User as UserIcon, Briefcase, PlusCircle, LayoutDashboard, Search } from "lucide-react";
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
    // If not provided server-side, check client-side
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          href={user ? (isTalent ? "/talent/dashboard" : "/vendor/dashboard") : "/"}
          className="flex items-center gap-2.5 font-bold text-lg text-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <span>
            MatchWork<span className="text-purple-600">AI</span>
          </span>
        </Link>

        {/* Center Navigation Links based on Role */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {user && isTalent && (
            <>
              <Link
                href="/talent/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/talent/dashboard")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/talent/projects"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/talent/projects")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Search className="h-4 w-4" />
                Jelajahi Proyek
              </Link>
              <Link
                href="/talent/applications"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/talent/applications")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Lamaran Saya
              </Link>
              <Link
                href="/talent/profile"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/talent/profile")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Profil Saya
              </Link>
            </>
          )}

          {user && isVendor && (
            <>
              <Link
                href="/vendor/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/vendor/dashboard")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/vendor/projects/new"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/vendor/projects/new")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                Posting Proyek
              </Link>
            </>
          )}
        </nav>

        {/* Right Section: Auth buttons or User Profile Dropdown */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 hover:ring-2 hover:ring-purple-200 transition-all">
                <Avatar
                  fallback={user.fullName || user.email || "U"}
                  className="h-9 w-9 bg-purple-100 text-purple-700 font-bold"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-500 font-normal truncate">{user.email}</p>
                  <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {user.role === "talent" ? "Talent" : "Vendor"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isTalent ? (
                  <DropdownMenuItem onClick={() => router.push("/talent/profile")}>
                    <UserIcon className="h-4 w-4" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => router.push("/vendor/dashboard")}>
                    <Briefcase className="h-4 w-4" />
                    <span>Kelola Proyek</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Keluar..." : "Keluar"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Masuk
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
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
