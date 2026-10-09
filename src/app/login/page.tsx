"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormItem, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
      const msg = "Kredensial Supabase belum diisi. Silakan isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di file .env.local dengan kredensial project Supabase Anda.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        let friendlyMessage = error.message;
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_credentials")) {
          friendlyMessage = "Email atau password yang kamu masukkan tidak cocok.";
        } else if (error.message.includes("Email not confirmed")) {
          friendlyMessage = "Email belum dikonfirmasi. Silakan buka tautan konfirmasi di inbox email kamu.";
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          friendlyMessage = "Tidak dapat terhubung ke server Supabase. Pastikan URL Supabase di .env.local valid dan koneksi internet aktif.";
        }
        setErrorMessage(friendlyMessage);
        toast.error(friendlyMessage);
        return;
      }

      if (data.user) {
        toast.success("Berhasil masuk! Mengarahkan ke dashboard...");

        // Fetch role from profile table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || data.user.user_metadata?.role || "talent";

        // Check if onboarding is completed
        if (role === "talent") {
          const { data: talentProf } = await supabase
            .from("talent_profiles")
            .select("headline, location")
            .eq("user_id", data.user.id)
            .single();

          if (!talentProf?.headline || !talentProf?.location) {
            router.push("/onboarding");
          } else {
            router.push("/talent/dashboard");
          }
        } else {
          const { data: vendorProf } = await supabase
            .from("vendor_profiles")
            .select("location, description")
            .eq("user_id", data.user.id)
            .single();

          if (!vendorProf?.location || !vendorProf?.description) {
            router.push("/onboarding");
          } else {
            router.push("/vendor/dashboard");
          }
        }

        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan koneksi.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Senang melihatmu kembali!"
      description="Masuk ke Pathfolio untuk melanjutkan perjalanan dan menemukan proyek yang cocok dengan keahlianmu."
    >
      <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-400/10 backdrop-blur-sm sm:p-8">
        {errorMessage && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormItem>
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Alamat email</Label>
            <div className="relative mt-1.5">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                className="h-12 rounded-full border-transparent bg-[#f5f0ec] pl-11 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                {...register("email")}
              />
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            </div>
            {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
          </FormItem>

          <FormItem>
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                className="h-12 rounded-full border-transparent bg-[#f5f0ec] pl-11 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                {...register("password")}
              />
              <Lock className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            </div>
            {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
          </FormItem>

          <Button
            type="submit"
            isLoading={isLoading}
            className="h-12 w-full rounded-full bg-[#f5f0ec] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white"
          >
            Masuk
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-700">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-sky-800 underline-offset-4 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </AuthLayout>
  );
}
