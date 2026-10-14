"use server";

import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validators/project";
import { SHOW_MATCH_TO_TALENT } from "@/lib/config";
import { resolveOtherPartyName } from "@/lib/chat";
import type { ApplicationStatus, Message, UserRole } from "@/types/database";

export interface ConversationListItem {
  id: string;
  applicationId: string;
  projectId: string;
  projectTitle: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyRole: UserRole;
  otherPartyAvatar: string | null;
  applicationStatus: ApplicationStatus;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  matchScore?: number | null;
}

export interface ConversationThreadDetail {
  id: string;
  applicationId: string;
  projectId: string;
  projectTitle: string;
  applicationStatus: ApplicationStatus;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyRole: UserRole;
  otherPartyAvatar: string | null;
  otherPartyLastReadAt: string | null;
  matchScore?: number | null;
}

/**
 * Mengambil daftar percakapan aktif milik pengguna (Talent atau Vendor).
 */
export async function getUserConversations(): Promise<{
  data: ConversationListItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: [], error: "Silakan login terlebih dahulu." };
    }

    // Ambil role pengguna saat ini
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const myRole = (myProfile?.role || "talent") as UserRole;

    // 1. Ambil data percakapan milik user beserta relasi profil lawan bicara
    const { data: convRows, error: convError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        application_id,
        talent_id,
        vendor_id,
        created_at,
        last_message_at,
        last_message_preview,
        applications (
          id,
          project_id,
          status,
          match_score,
          message,
          projects (
            id,
            title
          )
        ),
        talent_profiles:talent_id (
          user_id,
          headline,
          profiles!talent_profiles_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        vendor_profiles:vendor_id (
          user_id,
          organization_name,
          profiles!vendor_profiles_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        )
      `
      )
      .or(`talent_id.eq.${user.id},vendor_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (convError || !convRows) {
      if (
        convError?.code === "42P01" ||
        convError?.message?.includes("table") ||
        convError?.message?.includes("cache")
      ) {
        return { data: [], error: null };
      }
      console.error("Error fetching conversations:", convError);
      return { data: [], error: "Gagal memuat percakapan." };
    }

    if (convRows.length === 0) {
      return { data: [], error: null };
    }

    // 2. Ambil unread count per percakapan via RPC
    const unreadMap: Record<string, number> = {};
    try {
      const { data: unreadRows } = await supabase.rpc("get_unread_counts");
      if (unreadRows && Array.isArray(unreadRows)) {
        for (const row of unreadRows) {
          unreadMap[row.conversation_id] = Number(row.unread_count || 0);
        }
      }
    } catch (e) {
      console.warn("Could not fetch unread counts via RPC:", e);
    }

    // 3. Kumpulkan ID lawan bicara untuk batch fetch nama & avatar (sebagai fallback independen)
    const otherUserIds = Array.from(
      new Set(
        convRows.map((c) =>
          c.talent_id === user.id ? c.vendor_id : c.talent_id
        )
      )
    );

    const [profilesRes, vendorsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", otherUserIds),
      supabase
        .from("vendor_profiles")
        .select("user_id, organization_name")
        .in("user_id", otherUserIds),
    ]);

    const profileMap = new Map(
      (profilesRes.data || []).map((p) => [p.id, p])
    );
    const vendorMap = new Map(
      (vendorsRes.data || []).map((v) => [v.user_id, v.organization_name])
    );

    // 4. Transformasikan data percakapan
    const items: ConversationListItem[] = convRows.map((conv) => {
      const isMeTalent = conv.talent_id === user.id;
      const otherId = isMeTalent ? conv.vendor_id : conv.talent_id;
      const otherProfile = profileMap.get(otherId);
      const otherOrg = vendorMap.get(otherId);

      const appData = conv.applications as unknown as {
        id: string;
        project_id: string;
        status: ApplicationStatus;
        match_score: number | null;
        message?: string | null;
        projects: { id: string; title: string } | null;
      } | null;

      // Ambil profil tertanam dari relasi
      const embeddedTalent = (conv as unknown as {
        talent_profiles?: {
          headline?: string | null;
          profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
        } | null;
      }).talent_profiles;

      const embeddedVendor = (conv as unknown as {
        vendor_profiles?: {
          organization_name?: string | null;
          profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
        } | null;
      }).vendor_profiles;

      const otherRole: UserRole = isMeTalent ? "vendor" : "talent";
      const otherName = resolveOtherPartyName({
        isMeTalent,
        directProfileName: otherProfile?.full_name,
        embeddedProfileName: isMeTalent
          ? embeddedVendor?.profiles?.full_name
          : embeddedTalent?.profiles?.full_name,
        vendorOrgName: otherOrg || embeddedVendor?.organization_name,
        applicationMessage: appData?.message,
      });

      const otherAvatar =
        otherProfile?.avatar_url ||
        (isMeTalent
          ? embeddedVendor?.profiles?.avatar_url
          : embeddedTalent?.profiles?.avatar_url) ||
        null;

      const projectTitle = appData?.projects?.title || "Proyek";
      const applicationStatus = appData?.status || "pending";

      // Match Score TIDAK BOLEH dikirim ke client talent bila flag SHOW_MATCH_TO_TALENT false
      const allowMatchScore = myRole === "vendor" || SHOW_MATCH_TO_TALENT;
      const matchScore = allowMatchScore ? appData?.match_score : null;

      return {
        id: conv.id,
        applicationId: conv.application_id,
        projectId: appData?.project_id || "",
        projectTitle,
        otherPartyId: otherId,
        otherPartyName: otherName,
        otherPartyRole: otherRole,
        otherPartyAvatar: otherAvatar,
        applicationStatus,
        lastMessageAt: conv.last_message_at,
        lastMessagePreview: conv.last_message_preview,
        unreadCount: unreadMap[conv.id] || 0,
        ...(allowMatchScore ? { matchScore } : {}),
      };
    });

    return { data: items, error: null };
  } catch (err: unknown) {
    console.error("Error in getUserConversations:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Terjadi kesalahan memuat percakapan.",
    };
  }
}

/**
 * Mengambil detail satu percakapan beserta informasi lawan bicara dan status baca.
 */
export async function getConversationDetail(
  conversationId: string
): Promise<{ data: ConversationThreadDetail | null; error: string | null }> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { data: null, error: "ID percakapan tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: "Silakan login terlebih dahulu." };
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const myRole = (myProfile?.role || "talent") as UserRole;

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        application_id,
        talent_id,
        vendor_id,
        applications (
          id,
          project_id,
          status,
          match_score,
          message,
          projects (
            id,
            title
          )
        ),
        talent_profiles:talent_id (
          user_id,
          headline,
          profiles!talent_profiles_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        vendor_profiles:vendor_id (
          user_id,
          organization_name,
          profiles!vendor_profiles_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        )
      `
      )
      .eq("id", conversationId)
      .maybeSingle();

    if (convError || !conv) {
      return { data: null, error: "Percakapan tidak ditemukan." };
    }

    if (conv.talent_id !== user.id && conv.vendor_id !== user.id) {
      return { data: null, error: "Akses ditolak." };
    }

    const isMeTalent = conv.talent_id === user.id;
    const otherId = isMeTalent ? conv.vendor_id : conv.talent_id;
    const otherRole: UserRole = isMeTalent ? "vendor" : "talent";

    const [otherProfileRes, vendorOrgRes, otherReadRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle(),
      isMeTalent
        ? supabase
            .from("vendor_profiles")
            .select("organization_name")
            .eq("user_id", otherId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("conversation_reads")
        .select("last_read_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", otherId)
        .maybeSingle(),
    ]);

    const appData = conv.applications as unknown as {
      id: string;
      project_id: string;
      status: ApplicationStatus;
      match_score: number | null;
      message?: string | null;
      projects: { id: string; title: string } | null;
    } | null;

    const embeddedTalent = (conv as unknown as {
      talent_profiles?: {
        headline?: string | null;
        profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
      } | null;
    }).talent_profiles;

    const embeddedVendor = (conv as unknown as {
      vendor_profiles?: {
        organization_name?: string | null;
        profiles?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
      } | null;
    }).vendor_profiles;

    const otherName = resolveOtherPartyName({
      isMeTalent,
      directProfileName: otherProfileRes.data?.full_name,
      embeddedProfileName: isMeTalent
        ? embeddedVendor?.profiles?.full_name
        : embeddedTalent?.profiles?.full_name,
      vendorOrgName: vendorOrgRes.data?.organization_name || embeddedVendor?.organization_name,
      applicationMessage: appData?.message,
    });

    const otherAvatar =
      otherProfileRes.data?.avatar_url ||
      (isMeTalent
        ? embeddedVendor?.profiles?.avatar_url
        : embeddedTalent?.profiles?.avatar_url) ||
      null;

    const allowMatchScore = myRole === "vendor" || SHOW_MATCH_TO_TALENT;

    return {
      data: {
        id: conv.id,
        applicationId: conv.application_id,
        projectId: appData?.project_id || "",
        projectTitle: appData?.projects?.title || "Proyek",
        applicationStatus: appData?.status || "pending",
        otherPartyId: otherId,
        otherPartyName: otherName,
        otherPartyRole: otherRole,
        otherPartyAvatar: otherAvatar,
        otherPartyLastReadAt: otherReadRes.data?.last_read_at || null,
        ...(allowMatchScore ? { matchScore: appData?.match_score } : {}),
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error in getConversationDetail:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal memuat detail percakapan.",
    };
  }
}

/**
 * Mengambil daftar pesan pada percakapan dengan paginasi cursor (limit 50).
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 50,
  beforeCreatedAt?: string
): Promise<{
  messages: Message[];
  hasMore: boolean;
  error: string | null;
}> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { messages: [], hasMore: false, error: "ID percakapan tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { messages: [], hasMore: false, error: "Silakan login terlebih dahulu." };
    }

    let query = supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        sender_id,
        kind,
        body,
        metadata,
        created_at,
        profiles:sender_id (
          id,
          full_name,
          avatar_url,
          role
        )
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (beforeCreatedAt) {
      query = query.lt("created_at", beforeCreatedAt);
    }

    const { data: rows, error: msgError } = await query;

    if (msgError || !rows) {
      console.error("Error fetching messages:", msgError);
      return { messages: [], hasMore: false, error: "Gagal memuat pesan." };
    }

    const hasMore = rows.length > limit;
    const rawList = hasMore ? rows.slice(0, limit) : rows;

    // Balik urutan agar ascending (pesan terlama di atas, terbaru di bawah)
    const formatted: Message[] = rawList.reverse().map((r) => ({
      id: r.id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      kind: r.kind,
      body: r.body,
      metadata: r.metadata as Record<string, unknown>,
      created_at: r.created_at,
      sender: r.profiles as unknown as Message["sender"],
    }));

    return { messages: formatted, hasMore, error: null };
  } catch (err: unknown) {
    console.error("Error in getConversationMessages:", err);
    return {
      messages: [],
      hasMore: false,
      error: err instanceof Error ? err.message : "Gagal memuat pesan.",
    };
  }
}

/**
 * Mencari atau mengembalikan conversation_id berdasarkan application_id.
 */
export async function getConversationIdByApplication(
  applicationId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  try {
    const idValidation = uuidSchema.safeParse(applicationId);
    if (!idValidation.success) {
      return { conversationId: null, error: "ID lamaran tidak valid." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (error || !data) {
      return { conversationId: null, error: null };
    }

    return { conversationId: data.id, error: null };
  } catch (err: unknown) {
    return { conversationId: null, error: err instanceof Error ? err.message : "Gagal." };
  }
}
