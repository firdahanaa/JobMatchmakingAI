import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations, getConversationIdByApplication } from "@/app/(chat)/queries";
import { ChatInbox } from "@/components/chat/chat-inbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesan & Diskusi Proyek",
  description: "Diskusikan proyek, bertukar kontak, dan jadwalkan meeting dengan vendor.",
};

interface MessagesPageProps {
  searchParams: Promise<{
    appId?: string;
  }>;
}

export default async function TalentMessagesPage({ searchParams }: MessagesPageProps) {
  const { appId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/talent/messages");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "talent") {
    redirect("/vendor/messages");
  }

  const { data: conversations } = await getUserConversations();

  // Jika ada query param appId, cari conversation ID terkait
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
          role: "talent",
          name: profile.full_name || "Talenta",
        }}
      />
    </div>
  );
}
