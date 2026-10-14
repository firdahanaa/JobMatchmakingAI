import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations } from "@/app/(chat)/queries";
import { ChatInbox } from "@/components/chat/chat-inbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesan & Diskusi Pelamar",
  description: "Diskusikan proyek, bertukar kontak, dan jadwalkan meeting dengan talenta.",
};

interface VendorMessageDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorMessageDetailPage({ params }: VendorMessageDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/vendor/messages/${id}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "vendor") {
    redirect(`/talent/messages/${id}`);
  }

  const { data: conversations } = await getUserConversations();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <ChatInbox
        initialConversations={conversations}
        initialActiveId={id}
        currentUser={{
          id: user.id,
          role: "vendor",
          name: profile.full_name || "Vendor",
        }}
      />
    </div>
  );
}
