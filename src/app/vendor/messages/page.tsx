import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations, getConversationIdByApplication } from "@/app/(chat)/queries";
import { ChatInbox } from "@/components/chat/chat-inbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesan & Diskusi Pelamar",
  description: "Diskusikan proyek, bertukar kontak, dan jadwalkan meeting dengan talenta.",
};

interface VendorMessagesPageProps {
  searchParams: Promise<{
    appId?: string;
  }>;
}

export default async function VendorMessagesPage({ searchParams }: VendorMessagesPageProps) {
  const { appId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/vendor/messages");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "vendor") {
    redirect("/talent/messages");
  }

  const { data: conversations } = await getUserConversations();

  let initialActiveId: string | null = null;
  if (appId) {
    const match = conversations.find((c) => c.applicationId === appId);
    if (match) {
      initialActiveId = match.id;
    } else {
      const { conversationId } = await getConversationIdByApplication(appId);
      if (conversationId) {
        initialActiveId = conversationId;
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <ChatInbox
        initialConversations={conversations}
        initialActiveId={initialActiveId}
        currentUser={{
          id: user.id,
          role: "vendor",
          name: profile.full_name || "Vendor",
        }}
      />
    </div>
  );
}
