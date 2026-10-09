"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Briefcase, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormItem, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
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
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: defaultRole,
      acceptTerms: false,
    },
  });

  React.useEffect(() => {
    if (roleParam === "vendor" || roleParam === "talent") {
      setValue("role", roleParam);
    }
  }, [roleParam, setValue]);

  const selectedRole = useWatch({ control, name: "role" });

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
    <AuthLayout
      heading="Ayo mulai perjalananmu!"
      description="Buat akun Pathfolio dan temukan peluang baru untuk mengembangkan pengalamanmu."
    >
        <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-400/10 backdrop-blur-sm sm:p-7">
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
              <p className="text-sm leading-relaxed text-slate-500">{successInfo}</p>
              <Link href="/login" className="inline-block pt-2">
                <Button variant="outline">Menuju Halaman Masuk</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormItem>
                  <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nama</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    className="mt-1.5 h-11 rounded-full border-transparent bg-[#f5f0ec] px-5 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                    {...register("fullName")}
                  />
                  {errors.fullName && <FormMessage>{errors.fullName.message}</FormMessage>}
                </FormItem>

                <FormItem>
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Alamat email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className="mt-1.5 h-11 rounded-full border-transparent bg-[#f5f0ec] px-5 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                    {...register("email")}
                  />
                  {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
                </FormItem>

                <FormItem>
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    className="mt-1.5 h-11 rounded-full border-transparent bg-[#f5f0ec] px-5 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                    {...register("password")}
                  />
                  {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
                </FormItem>

                <FormItem>
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Konfirmasi password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    className="mt-1.5 h-11 rounded-full border-transparent bg-[#f5f0ec] px-5 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && <FormMessage>{errors.confirmPassword.message}</FormMessage>}
                </FormItem>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-slate-700">Daftar sebagai</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("role", "talent")}
                    aria-pressed={selectedRole === "talent"}
                    className={`flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      selectedRole === "talent"
                        ? "border-sky-700 bg-sky-800 text-white"
                        : "border-white/80 bg-white/60 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Talent
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("role", "vendor")}
                    aria-pressed={selectedRole === "vendor"}
                    className={`flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      selectedRole === "vendor"
                        ? "border-sky-700 bg-sky-800 text-white"
                        : "border-white/80 bg-white/60 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    Vendor
                  </button>
                </div>
                {errors.role && <FormMessage>{errors.role.message}</FormMessage>}
              </div>

              <div>
                <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400 accent-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                    {...register("acceptTerms")}
                  />
                  <span>Saya setuju dengan syarat penggunaan dan kebijakan privasi Pathfolio.</span>
                </label>
                {errors.acceptTerms && <FormMessage>{errors.acceptTerms.message}</FormMessage>}
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="h-12 w-full gap-2 rounded-full bg-[#f5f0ec] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white"
              >
                Daftar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </section>

        <p className="mt-5 text-center text-sm text-slate-700">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-sky-800 underline-offset-4 hover:underline">
            Masuk
          </Link>
        </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#c9dce7]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-700 border-t-transparent" />
        </div>
      }
    >
      <RegisterForm />
    </React.Suspense>
  );
}
