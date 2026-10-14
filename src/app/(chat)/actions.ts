"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validators/project";
import {
  canSendMessage,
  getChatNotice,
  normalizeWhatsAppNumber,
  buildWhatsAppLink,
  meetingProposalSchema,
  sanitizeMessageBody,
  type MeetingProposalInput,
} from "@/lib/chat";
import type { ApplicationStatus, Message } from "@/types/database";

const RATE_LIMIT_PER_MINUTE = 20;
const memoryUserRateLimit = new Map<string, number[]>();

/**
 * Batasi laju pengiriman pesan: maksimal 20 pesan per menit per user.
 */
async function enforceRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ allowed: boolean; error?: string }> {
  const now = Date.now();
  const windowMs = 60 * 1000;

  // 1. Cek memory window
  const timestamps = (memoryUserRateLimit.get(userId) || []).filter(
    (t) => now - t < windowMs
  );
  if (timestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      error:
        "Kamu mengirim pesan terlalu cepat. Harap tunggu sebentar sebelum mengirim pesan baru.",
    };
  }

  // 2. Cek database messages 1 menit terakhir
  const oneMinuteAgo = new Date(now - windowMs).toISOString();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", oneMinuteAgo);

  if (!error && count !== null && count >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      error:
        "Kamu mengirim pesan terlalu cepat. Harap tunggu sebentar sebelum mengirim pesan baru.",
    };
  }

  timestamps.push(now);
  memoryUserRateLimit.set(userId, timestamps);
  return { allowed: true };
}

/**
 * Validasi percakapan dan kepesertaan user serta status aplikasi.
 */
async function getValidatedConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string
) {
  const { data: conv, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      application_id,
      talent_id,
      vendor_id,
      applications (
        id,
        status,
        project_id
      )
    `
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conv) {
    return { error: "Percakapan tidak ditemukan." };
  }

  if (conv.talent_id !== userId && conv.vendor_id !== userId) {
    return { error: "Akses ditolak. Kamu bukan peserta percakapan ini." };
  }

  const app = conv.applications as unknown as {
    id: string;
    status: ApplicationStatus;
    project_id: string;
  } | null;

  const status = app?.status || "pending";
  if (!canSendMessage(status)) {
    const notice = getChatNotice(status) || "Percakapan dalam mode hanya-baca.";
    return { error: notice };
  }

  return { conversation: conv, application: app };
}

/**
 * 1. Mengirim pesan teks biasa ke percakapan.
 */
export async function sendTextMessage(
  conversationId: string,
  rawBody: string
): Promise<{ success: boolean; error: string | null; message?: Message }> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { success: false, error: "ID percakapan tidak valid." };
    }

    let sanitizedBody = "";
    try {
      sanitizedBody = sanitizeMessageBody(rawBody);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Pesan tidak valid.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk mengirim pesan." };
    }

    const validation = await getValidatedConversation(
      supabase,
      conversationId,
      user.id
    );
    if (validation.error) {
      return { success: false, error: validation.error };
    }

    const rateLimit = await enforceRateLimit(supabase, user.id);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Rate limit terlampaui." };
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        kind: "text",
        body: sanitizedBody,
        metadata: {},
      })
      .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
      .single();

    if (insertError || !insertedMessage) {
      return {
        success: false,
        error: insertError?.message || "Gagal mengirim pesan.",
      };
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");

    return {
      success: true,
      error: null,
      message: insertedMessage as unknown as Message,
    };
  } catch (err: unknown) {
    console.error("Error in sendTextMessage:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengirim pesan.",
    };
  }
}

const shareWhatsAppSchema = z.object({
  number: z.string().trim().min(5, "Nomor WhatsApp wajib diisi."),
  note: z.string().trim().max(300, "Catatan maksimal 300 karakter.").optional(),
});

/**
 * 2. Membagikan kontak WhatsApp terverifikasi dengan tautan otomatis.
 */
export async function shareWhatsApp(
  conversationId: string,
  number: string,
  note?: string
): Promise<{ success: boolean; error: string | null; message?: Message }> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { success: false, error: "ID percakapan tidak valid." };
    }

    const inputValidation = shareWhatsAppSchema.safeParse({ number, note });
    if (!inputValidation.success) {
      return {
        success: false,
        error: inputValidation.error.issues[0]?.message || "Nomor WhatsApp tidak valid.",
      };
    }

    let normalizedNumber = "";
    try {
      normalizedNumber = normalizeWhatsAppNumber(number);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Nomor WhatsApp tidak valid.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk membagikan kontak." };
    }

    const validation = await getValidatedConversation(
      supabase,
      conversationId,
      user.id
    );
    if (validation.error) {
      return { success: false, error: validation.error };
    }

    const rateLimit = await enforceRateLimit(supabase, user.id);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Rate limit terlampaui." };
    }

    const cleanNote = note?.trim() || "";
    const waLink = buildWhatsAppLink(normalizedNumber, cleanNote || undefined);
    const body = cleanNote
      ? `Kontak WhatsApp dibagikan: +${normalizedNumber}\nCatatan: ${cleanNote}`
      : `Kontak WhatsApp dibagikan: +${normalizedNumber}`;

    const metadata = {
      type: "whatsapp",
      number: normalizedNumber,
      link: waLink,
      note: cleanNote || null,
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        kind: "contact",
        body,
        metadata,
      })
      .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
      .single();

    if (insertError || !insertedMessage) {
      return {
        success: false,
        error: insertError?.message || "Gagal membagikan kontak WhatsApp.",
      };
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");

    return {
      success: true,
      error: null,
      message: insertedMessage as unknown as Message,
    };
  } catch (err: unknown) {
    console.error("Error in shareWhatsApp:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membagikan kontak WhatsApp.",
    };
  }
}

/**
 * 3. Mengajukan usulan jadwal meeting baru.
 */
export async function proposeMeeting(
  conversationId: string,
  payload: MeetingProposalInput
): Promise<{ success: boolean; error: string | null; message?: Message }> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { success: false, error: "ID percakapan tidak valid." };
    }

    const parseResult = meetingProposalSchema.safeParse(payload);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Data meeting tidak valid.",
      };
    }
    const meetingData = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk mengajukan meeting." };
    }

    const validation = await getValidatedConversation(
      supabase,
      conversationId,
      user.id
    );
    if (validation.error) {
      return { success: false, error: validation.error };
    }

    const rateLimit = await enforceRateLimit(supabase, user.id);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Rate limit terlampaui." };
    }

    const formattedTime = new Date(meetingData.startsAt).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const body = `Usulan Jadwal Meeting: ${meetingData.title} (${meetingData.durationMinutes} menit pada ${formattedTime})`;

    const metadata = {
      ...meetingData,
      status: "proposed",
      proposedBy: user.id,
      proposedAt: new Date().toISOString(),
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        kind: "meeting",
        body,
        metadata,
      })
      .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
      .single();

    if (insertError || !insertedMessage) {
      return {
        success: false,
        error: insertError?.message || "Gagal mengajukan meeting.",
      };
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");

    return {
      success: true,
      error: null,
      message: insertedMessage as unknown as Message,
    };
  } catch (err: unknown) {
    console.error("Error in proposeMeeting:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengajukan meeting.",
    };
  }
}

const responseSchema = z.enum(["confirmed", "declined"]);

/**
 * 4. Merespons usulan meeting (hanya pihak lawan yang boleh merespons).
 */
export async function respondToMeeting(
  messageId: string,
  response: "confirmed" | "declined"
): Promise<{ success: boolean; error: string | null; status?: string }> {
  try {
    const idValidation = uuidSchema.safeParse(messageId);
    if (!idValidation.success) {
      return { success: false, error: "ID pesan meeting tidak valid." };
    }

    const resValidation = responseSchema.safeParse(response);
    if (!resValidation.success) {
      return { success: false, error: "Respons meeting harus 'confirmed' atau 'declined'." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk merespons meeting." };
    }

    // 1. Ambil data pesan meeting
    const { data: msg, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, kind, body, metadata")
      .eq("id", messageId)
      .maybeSingle();

    if (msgError || !msg) {
      return { success: false, error: "Pesan meeting tidak ditemukan." };
    }

    if (msg.kind !== "meeting") {
      return { success: false, error: "Pesan yang dipilih bukan merupakan usulan meeting." };
    }

    const metadata = (msg.metadata || {}) as Record<string, unknown>;
    if (metadata.status && metadata.status !== "proposed") {
      return {
        success: false,
        error: `Usulan meeting sudah pernah direspons sebelumnya (${metadata.status}).`,
      };
    }

    // 2. Ambil data percakapan untuk verifikasi peserta
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, talent_id, vendor_id, application_id")
      .eq("id", msg.conversation_id)
      .maybeSingle();

    if (convError || !conv) {
      return { success: false, error: "Percakapan tidak ditemukan." };
    }

    if (conv.talent_id !== user.id && conv.vendor_id !== user.id) {
      return { success: false, error: "Akses ditolak. Kamu bukan peserta percakapan ini." };
    }

    // 3. ATURAN KRITIS: Hanya pihak LAIN (bukan pengusul) yang boleh merespons
    const proposedBy = metadata.proposedBy || msg.sender_id;
    if (proposedBy === user.id) {
      return {
        success: false,
        error: "Kamu tidak dapat merespons usulan meeting yang kamu buat sendiri.",
      };
    }

    // 4. Update metadata status menggunakan admin client (melewati batasan update messages client)
    const admin = createAdminClient();
    const updatedMetadata = {
      ...metadata,
      status: response,
      respondedBy: user.id,
      respondedAt: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from("messages")
      .update({ metadata: updatedMetadata })
      .eq("id", messageId);

    if (updateError) {
      return { success: false, error: "Gagal memperbarui status meeting." };
    }

    // 5. Buat pesan sistem otomatis: "Meeting dikonfirmasi/ditolak oleh ..."
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const responderName =
      profile?.full_name || (user.id === conv.talent_id ? "Talenta" : "Vendor");
    const meetingTitle = (metadata.title as string) || "Meeting";

    const systemBody =
      response === "confirmed"
        ? `Meeting "${meetingTitle}" telah dikonfirmasi oleh ${responderName}.`
        : `Meeting "${meetingTitle}" ditolak oleh ${responderName}.`;

    await admin.from("messages").insert({
      conversation_id: conv.id,
      sender_id: null,
      kind: "system",
      body: systemBody,
      metadata: {
        related_message_id: messageId,
        response,
      },
    });

    revalidatePath(`/messages/${conv.id}`);
    revalidatePath("/messages");

    return { success: true, error: null, status: response };
  } catch (err: unknown) {
    console.error("Error in respondToMeeting:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal merespons meeting.",
    };
  }
}

/**
 * 5. Menandai percakapan telah dibaca (upsert ke conversation_reads).
 */
export async function markConversationRead(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const idValidation = uuidSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return { success: false, error: "ID percakapan tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk menandai percakapan." };
    }

    // Pastikan user merupakan partisipan percakapan
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, talent_id, vendor_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError || !conv) {
      return { success: false, error: "Percakapan tidak ditemukan." };
    }

    if (conv.talent_id !== user.id && conv.vendor_id !== user.id) {
      return { success: false, error: "Akses ditolak." };
    }

    const { error: upsertError } = await supabase
      .from("conversation_reads")
      .upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error in markConversationRead:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menandai percakapan.",
    };
  }
}
