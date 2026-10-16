"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChatConversationList } from "./chat-conversation-list";
import { ChatThread } from "./chat-thread";
import {
  getUserConversations,
  getConversationDetail,
  getConversationMessages,
  type ConversationListItem,
  type ConversationThreadDetail,
} from "@/app/(chat)/queries";
import {
  sendTextMessage,
  markConversationRead,
} from "@/app/(chat)/actions";
import type { ExtendedMessage } from "./chat-message-item";
import type { Message, UserRole } from "@/types/database";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

interface ChatInboxProps {
  initialConversations: ConversationListItem[];
  initialActiveId?: string | null;
  currentUser: {
    id: string;
    role: UserRole;
    name: string;
  };
}

export function ChatInbox({
  initialConversations,
  initialActiveId,
  currentUser,
}: ChatInboxProps) {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationListItem[]>(
    initialConversations
  );
  const [activeId, setActiveId] = useState<string | null>(initialActiveId || null);
  const [activeConversation, setActiveConversation] =
    useState<ConversationThreadDetail | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const activeIdRef = useRef<string | null>(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 1. Memuat detail percakapan dan pesan saat activeId berubah
  useEffect(() => {
    if (!activeId) return;
    let isMounted = true;

    const fetchThread = async () => {
      try {
        const [detailRes, msgsRes] = await Promise.all([
          getConversationDetail(activeId),
          getConversationMessages(activeId, 50),
        ]);

        if (!isMounted) return;

        if (detailRes.error || !detailRes.data) {
          toast.error(detailRes.error || "Gagal memuat percakapan.");
          return;
        }

        setActiveConversation(detailRes.data);
        setMessages(msgsRes.messages);
        setHasMore(msgsRes.hasMore);

        // Tandai sudah dibaca
        markConversationRead(activeId).catch(console.error);

        // Update unread count lokal di list
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error("Error loading conversation data:", err);
      }
    };

    fetchThread();

    return () => {
      isMounted = false;
    };
  }, [activeId]);

  // 2. Navigasi / seleksi percakapan
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    const basePath = currentUser.role === "talent" ? "/talent/messages" : "/vendor/messages";
    router.push(`${basePath}/${id}`);
  };

  const handleBackToList = () => {
    setActiveId(null);
    setActiveConversation(null);
    setMessages([]);
    const basePath = currentUser.role === "talent" ? "/talent/messages" : "/vendor/messages";
    router.push(basePath);
  };

  // 3. Muat pesan lebih lama (Pagination Cursor)
  const handleLoadMore = async () => {
    if (!activeId || isLoadingMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessageDate = messages[0].created_at;
      const res = await getConversationMessages(activeId, 50, oldestMessageDate);

      if (res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
      }
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 4. Kirim Pesan dengan Optimistic Update
  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!activeId) return false;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ExtendedMessage = {
      id: tempId,
      conversation_id: activeId,
      sender_id: currentUser.id,
      kind: "text",
      body: text,
      metadata: {},
      created_at: new Date().toISOString(),
      isOptimistic: true,
      sender: {
        id: currentUser.id,
        role: currentUser.role,
        full_name: currentUser.name,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Update pratinjau lokal percakapan di daftar
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessageAt: optimisticMsg.created_at,
              lastMessagePreview: text.slice(0, 80),
            }
          : c
      )
    );

    try {
      const res = await sendTextMessage(activeId, text);
      if (!res.success || !res.message) {
        // Tandai gagal
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isOptimistic: false, isFailed: true } : m
          )
        );
        toast.error(res.error || "Gagal mengirim pesan.");
        return false;
      }

      // Gantikan pesan optimis dengan pesan asli dari server
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (res.message as ExtendedMessage) : m))
      );
      return true;
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, isOptimistic: false, isFailed: true } : m
        )
      );
      toast.error("Terjadi kesalahan saat mengirim pesan.");
      return false;
    }
  };

  // Retry pesan gagal
  const handleRetryMessage = async (msg: ExtendedMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    await handleSendMessage(msg.body);
  };

  // Update status meeting lokal saat direspon
  const handleMeetingStatusUpdated = (
    messageId: string,
    newStatus: "confirmed" | "declined"
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          return {
            ...m,
            metadata: {
              ...(m.metadata as Record<string, unknown>),
              status: newStatus,
            },
          };
        }
        return m;
      })
    );
  };

  // 5. SUPABASE REALTIME SUBSCRIPTION & FALLBACK POLLING
  useEffect(() => {
    const supabase = createClient();

    // Refresh daftar percakapan
    const refreshConversations = async () => {
      const res = await getUserConversations();
      if (!res.error && res.data) {
        setConversations(res.data);
      }
    };

    // Saluran realtime untuk tabel messages & conversations
    const channel = supabase
      .channel("chat-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;

          // Jika pesan masuk ke thread yang sedang aktif
          if (newMsg.conversation_id === activeIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Tandai sudah dibaca otomatis bila tab aktif
            if (newMsg.sender_id !== currentUser.id) {
              markConversationRead(newMsg.conversation_id).catch(console.error);
            }
          }

          // Perbarui list percakapan
          refreshConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (updatedMsg.conversation_id === activeIdRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_reads" },
        (payload) => {
          const readRow = payload.new as {
            conversation_id: string;
            user_id: string;
            last_read_at: string;
          };
          if (
            readRow.conversation_id === activeIdRef.current &&
            readRow.user_id !== currentUser.id
          ) {
            setActiveConversation((prev) =>
              prev ? { ...prev, otherPartyLastReadAt: readRow.last_read_at } : null
            );
          }
        }
      )
      .subscribe();

    // Fallback polling tiap 15 detik jika websocket terputus
    const intervalId = setInterval(() => {
      refreshConversations();
      if (activeIdRef.current) {
        getConversationMessages(activeIdRef.current, 50).then((res) => {
          if (!res.error && res.messages.length > 0) {
            setMessages((prev) => {
              // Pertahankan pesan optimis yang belum selesai
              const optimisticOnes = prev.filter((m) => m.isOptimistic || m.isFailed);
              const mergedMap = new Map<string, ExtendedMessage>();
              for (const m of res.messages) mergedMap.set(m.id, m);
              for (const o of optimisticOnes) mergedMap.set(o.id, o);
              return Array.from(mergedMap.values()).sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        });
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [currentUser.id]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-white">
      {/* PANEL KIRI: DAFTAR PERCAKAPAN */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
          activeId ? "hidden md:block" : "block"
        }`}
      >
        <ChatConversationList
          conversations={conversations}
          activeConversationId={activeId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* PANEL KANAN: THREAD PERCAKAPAN */}
      <div
        className={`flex-1 h-full min-w-0 ${
          activeId ? "block" : "hidden md:flex md:flex-col"
        }`}
      >
        {activeId && activeConversation ? (
          <ChatThread
            conversation={activeConversation}
            currentUser={currentUser}
            messages={messages}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            onSendMessage={handleSendMessage}
            onRetryMessage={handleRetryMessage}
            onMeetingStatusUpdated={handleMeetingStatusUpdated}
            onBackClick={handleBackToList}
            isMobile={Boolean(activeId)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 bg-slate-50/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 mb-4 border border-sky-100 shadow-sm">
              <MessageSquare className="h-8 w-8 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-black text-[#0F172A] mb-1.5">
              Pilih Percakapan
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Pilih salah satu percakapan di sebelah kiri untuk mulai berdiskusi, bertukar kontak, atau menjadwalkan meeting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
