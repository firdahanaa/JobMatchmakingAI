"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, User, Briefcase, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormItem, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role")?.trim().toLowerCase();
  const defaultRole = (roleParam === "vendor" ? "vendor" : "talent") as "talent" | "vendor";

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successInfo, setSuccessInfo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: defaultRole,
    },
  });

  React.useEffect(() => {
    if (roleParam === "vendor" || roleParam === "talent") {
      setValue("role", roleParam);
    }
  }, [roleParam, setValue]);

  const selectedRole = watch("role");

  const onSubmit = async (values: RegisterInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

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

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            role: values.role,
            full_name: values.fullName,
          },
        },
      });

      if (error) {
        let friendlyMessage = error.message;
        if (error.message.includes("User already registered") || error.message.includes("already registered")) {
          friendlyMessage = "Email ini sudah terdaftar. Silakan langsung masuk lewat halaman login.";
        } else if (error.message.includes("Password should be at least")) {
          friendlyMessage = "Password terlalu pendek. Gunakan minimal 8 karakter.";
        } else if (error.message.includes("rate limit")) {
          friendlyMessage = "Terlalu banyak percobaan. Harap tunggu sebentar sebelum mencoba lagi.";
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          friendlyMessage = "Tidak dapat terhubung ke server Supabase. Pastikan URL Supabase di .env.local valid dan koneksi internet aktif.";
        }
        setErrorMessage(friendlyMessage);
        toast.error(friendlyMessage);
        return;
      }

      if (data.session) {
        toast.success("Pendaftaran berhasil! Mengalihkan ke onboarding...");
        router.push("/onboarding");
        router.refresh();
      } else {
        // Confirmation email required
        setSuccessInfo(
          "Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email kamu. Silakan periksa kotak masuk atau spam email kamu."
        );
        toast.success("Akun berhasil dibuat!");
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
          Buat Akun Baru
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-700">
            Masuk di sini
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

          {successInfo ? (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Periksa Email Kamu</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{successInfo}</p>
              <Link href="/login" className="inline-block pt-2">
                <Button variant="outline">Menuju Halaman Masuk</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Role Selection Tabs */}
              <div>
                <Label className="block mb-2 font-medium">Saya mendaftar sebagai:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("role", "talent")}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === "talent"
                        ? "border-purple-600 bg-purple-50/80 text-purple-900 ring-2 ring-purple-600/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <User className={`h-5 w-5 mb-1 ${selectedRole === "talent" ? "text-purple-600" : "text-slate-400"}`} />
                    <span className="text-sm font-semibold">Talent</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Mahasiswa & Freelancer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue("role", "vendor")}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === "vendor"
                        ? "border-purple-600 bg-purple-50/80 text-purple-900 ring-2 ring-purple-600/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Briefcase className={`h-5 w-5 mb-1 ${selectedRole === "vendor" ? "text-purple-600" : "text-slate-400"}`} />
                    <span className="text-sm font-semibold">Vendor</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">UMKM & Startup</span>
                  </button>
                </div>
                {errors.role && <FormMessage>{errors.role.message}</FormMessage>}
              </div>

              {/* Full Name */}
              <FormItem>
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={selectedRole === "talent" ? "mis. Kevin Sanjaya" : "mis. Rahmat Hidayat (Pemilik UMKM)"}
                  {...register("fullName")}
                />
                {errors.fullName && <FormMessage>{errors.fullName.message}</FormMessage>}
              </FormItem>

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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimal 8 karakter"
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
                Daftar Sekarang
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        </div>
      }
    >
      <RegisterForm />
    </React.Suspense>
  );
}
