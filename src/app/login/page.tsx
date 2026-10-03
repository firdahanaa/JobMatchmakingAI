"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormItem, FormMessage } from "@/components/ui/form";
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
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-4 font-bold text-2xl text-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <span>
            MatchWork<span className="text-purple-600">AI</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Masuk ke Akun Kamu
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-purple-600 hover:text-purple-700">
            Daftar sekarang
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-md shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-rose-50 p-4 border border-rose-200 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <FormItem>
              <Label htmlFor="email">Alamat Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="pl-9"
                  {...register("email")}
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
            </FormItem>

            {/* Password */}
            <FormItem>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  className="pl-9"
                  {...register("password")}
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
            </FormItem>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium"
            >
              Masuk
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
