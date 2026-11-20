"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WorkMode } from "@/types/database";
import { talentOnboardingSchema } from "@/lib/validators/talent";

export interface TalentOnboardingData {
  fullName?: string;
  headline: string;
  education: string;
  location: string;
  hoursPerWeek: number;
  preferredMode: WorkMode;
  bio?: string;
}

export interface VendorOnboardingData {
  organizationName: string;
  description: string;
  location: string;
  website?: string;
}

/**
 * Server Action to save Talent onboarding data safely
 */
export async function saveTalentOnboarding(data: TalentOnboardingData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const parseResult = talentOnboardingSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Data profil Talent tidak valid.",
      };
    }

    const validated = parseResult.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Sesi telah berakhir. Silakan login kembali.",
      };
    }

    // 1. Ensure profile exists in profiles table and full_name is synchronized
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Talent onboarding role lookup error:", profileError);
      return { success: false, error: "Gagal memverifikasi akun Talent." };
    }
    if (existingProfile && existingProfile.role !== "talent") {
      return { success: false, error: "Akses ditolak. Akun ini bukan akun Talent." };
    }

    const userFullName = data.fullName?.trim() || user.user_metadata?.full_name?.trim();

    if (!existingProfile) {
      const { error: createProfileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "talent",
        full_name: userFullName || "Talenta",
      });
      if (createProfileError) {
        console.error("Create talent profile error:", createProfileError);
        return { success: false, error: "Gagal membuat profil Talent." };
      }
    } else if (userFullName) {
      await supabase
        .from("profiles")
        .update({ full_name: userFullName })
        .eq("id", user.id);
    }

    const { error: saveError } = await supabase
      .from("talent_profiles")
      .upsert({
        user_id: user.id,
        headline: validated.headline,
        education: validated.education,
        location: validated.location,
        hours_per_week: validated.hoursPerWeek,
        preferred_mode: validated.preferredMode,
        bio: validated.bio || null,
        updated_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error("Talent profile save error:", saveError);
      return { success: false, error: saveError.message };
    }

    revalidatePath("/talent/profile");
    revalidatePath("/talent/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error in saveTalentOnboarding:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil talenta.",
    };
  }
}

/**
 * Server Action to save Vendor onboarding data safely
 */
export async function saveVendorOnboarding(data: VendorOnboardingData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Sesi telah berakhir. Silakan login kembali.",
      };
    }

    if (!data.organizationName?.trim() || !data.description?.trim() || !data.location?.trim()) {
      return {
        success: false,
        error: "Harap lengkapi nama organisasi, deskripsi, dan lokasi.",
      };
    }

    // 1. Ensure profile exists in profiles table
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from("profiles").upsert({
        id: user.id,
        role: "vendor",
        full_name: data.organizationName.trim(),
      });
    }

    // 2. Check if vendor_profiles exists
    const { data: existingVendor } = await supabase
      .from("vendor_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let saveError;
    if (existingVendor) {
      const res = await supabase
        .from("vendor_profiles")
        .update({
          organization_name: data.organizationName.trim(),
          description: data.description.trim(),
          location: data.location.trim(),
          website: data.website?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      saveError = res.error;
    } else {
      const res = await supabase
        .from("vendor_profiles")
        .insert({
          user_id: user.id,
          organization_name: data.organizationName.trim(),
          description: data.description.trim(),
          location: data.location.trim(),
          website: data.website?.trim() || null,
          updated_at: new Date().toISOString(),
        });
      saveError = res.error;
    }

    if (saveError) {
      console.error("Vendor profile save error:", saveError);
      return { success: false, error: saveError.message };
    }

    revalidatePath("/vendor/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error in saveVendorOnboarding:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil vendor.",
    };
  }
}
