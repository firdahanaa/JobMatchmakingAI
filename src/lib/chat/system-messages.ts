import { createAdminClient } from "@/lib/supabase/admin";
import { formatSystemMessage, type SystemMessageEvent, type SystemMessageContext } from "./messages";

/**
 * Membuat pesan sistem otomatis menggunakan Supabase Service Role (Admin).
 * Dipanggil terpusat pada setiap transisi status workflow.
 */
export async function createChatSystemMessage(
  applicationId: string,
  event: SystemMessageEvent,
  ctx?: SystemMessageContext
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const admin = createAdminClient();

    // 1. Ambil conversation_id yang terikat dengan application_id
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();

    let conversationId = conv?.id;

    // Jika percakapan belum ada (misal data sebelum migrasi atau trigger tertunda), buat otomatis
    if (!conversationId) {
      const { data: appData, error: appError } = await admin
        .from("applications")
        .select("id, talent_id, project_id, projects(vendor_id)")
        .eq("id", applicationId)
        .maybeSingle();

      if (appError || !appData) {
        return { success: false, error: "Data lamaran tidak ditemukan." };
      }

      const projectRef = appData.projects as unknown as { vendor_id: string } | null;
      const vendorId = projectRef?.vendor_id;

      if (!vendorId) {
        return { success: false, error: "Vendor pemilik proyek tidak ditemukan." };
      }

      const { data: createdConv, error: createConvError } = await admin
        .from("conversations")
        .insert({
          application_id: applicationId,
          talent_id: appData.talent_id,
          vendor_id: vendorId,
        })
        .select("id")
        .single();

      if (createConvError || !createdConv) {
        return { success: false, error: "Gagal membuat entitas percakapan." };
      }

      conversationId = createdConv.id;
    }

    // 2. Format teks pesan sistem standar (tanpa bocor data sensitif)
    const body = formatSystemMessage(event, ctx);

    // 3. Masukkan ke tabel messages dengan sender_id null
    const { data: insertedMsg, error: insertError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: null,
        kind: "system",
        body,
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Gagal menyimpan pesan sistem chat:", insertError);
      return { success: false, error: insertError.message };
    }

    // 4. Update preview & timestamp di tabel conversations
    await admin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body.slice(0, 80),
      })
      .eq("id", conversationId);

    return { success: true, messageId: insertedMsg.id };
  } catch (err: unknown) {
    console.error("Error in createChatSystemMessage:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem chat.",
    };
  }
}
