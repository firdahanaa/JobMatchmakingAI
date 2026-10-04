"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WorkMode } from "@/types/database";

export interface TalentOnboardingData {
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

    if (!data.headline?.trim() || !data.education?.trim() || !data.location?.trim() || !data.hoursPerWeek) {
      return {
        success: false,
        error: "Harap lengkapi semua kolom wajib (headline, pendidikan, lokasi, jam per minggu).",
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
        role: "talent",
        full_name: user.user_metadata?.full_name || "Talenta",
      });
    }

    // 2. Check if talent_profiles exists
    const { data: existingTalent } = await supabase
      .from("talent_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let saveError;
    if (existingTalent) {
      const res = await supabase
        .from("talent_profiles")
        .update({
          headline: data.headline.trim(),
          education: data.education.trim(),
          location: data.location.trim(),
          hours_per_week: Number(data.hoursPerWeek),
          preferred_mode: data.preferredMode,
          bio: data.bio?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      saveError = res.error;
    } else {
      const res = await supabase
        .from("talent_profiles")
        .insert({
          user_id: user.id,
          headline: data.headline.trim(),
          education: data.education.trim(),
          location: data.location.trim(),
          hours_per_week: Number(data.hoursPerWeek),
          preferred_mode: data.preferredMode,
          bio: data.bio?.trim() || null,
          updated_at: new Date().toISOString(),
        });
      saveError = res.error;
    }

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
