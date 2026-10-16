import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations } from "@/app/(chat)/queries";
import { ChatInbox } from "@/components/chat/chat-inbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesan & Diskusi Proyek",
  description: "Diskusikan proyek, bertukar kontak, dan jadwalkan meeting dengan vendor.",
};

interface MessageDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TalentMessageDetailPage({ params }: MessageDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/talent/messages/${id}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "talent") {
    redirect(`/vendor/messages/${id}`);
  }

  const { data: conversations } = await getUserConversations();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <ChatInbox
        initialConversations={conversations}
        initialActiveId={id}
        currentUser={{
          id: user.id,
          role: "talent",
          name: profile.full_name || "Talenta",
        }}
      />
    </div>
  );
}
