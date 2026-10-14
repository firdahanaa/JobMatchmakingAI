"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Plus,
  MessageSquareShare,
  CalendarDays,
  ShieldAlert,
  Sparkles,
  Lock,
  ChevronDown,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChatMessageItem, type ExtendedMessage } from "./chat-message-item";
import { WhatsAppDialog } from "./whatsapp-dialog";
import { MeetingDialog } from "./meeting-dialog";
import { formatDateSeparator } from "./chat-date-utils";
import { canSendMessage, getChatNotice } from "@/lib/chat";
import { getApplicationStatusBadge } from "@/lib/workflow/transitions";
import { HELPDESK_EMAIL } from "@/lib/config";
import type { ConversationThreadDetail } from "@/app/(chat)/queries";
import type { UserRole } from "@/types/database";

interface ChatThreadProps {
  conversation: ConversationThreadDetail;
  currentUser: { id: string; role: UserRole; name: string };
  messages: ExtendedMessage[];
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSendMessage: (text: string) => Promise<boolean>;
  onRetryMessage?: (msg: ExtendedMessage) => void;
  onMeetingStatusUpdated?: (messageId: string, status: "confirmed" | "declined") => void;
  onBackClick?: () => void;
  isMobile?: boolean;
}

export function ChatThread({
  conversation,
  currentUser,
  messages,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSendMessage,
  onRetryMessage,
  onMeetingStatusUpdated,
  onBackClick,
  isMobile,
}: ChatThreadProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAllowedToSend = canSendMessage(conversation.applicationStatus);
  const chatNotice = getChatNotice(conversation.applicationStatus);

  // Auto-scroll logic: hanya scroll ke bawah bila posisi scroll mendekati bawah
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, isNearBottom]);

  const handleScroll = () => {
    if (isNearBottom()) {
      setShowScrollBottomBtn(false);
    } else {
      setShowScrollBottomBtn(true);
    }
  };

  // Submit Text Message
  const handleSend = async () => {
    if (!inputText.trim() || isSending || !isAllowedToSend) return;

    const text = inputText;
    setInputText("");
    setIsSending(true);

    try {
      const ok = await onSendMessage(text);
      if (!ok) {
        // jika gagal, teks bisa dikembalikan atau biarkan di bubble retry
      }
      scrollToBottom("smooth");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusBadge = getApplicationStatusBadge(conversation.applicationStatus);

  // Mailto Helpdesk Link
  const helpdeskSubject = `[Help Desk] Percakapan Proyek ${conversation.projectTitle}`;
  const helpdeskBody = `Halo Tim Bantuan,\n\nSaya ingin melaporkan kendala pada percakapan berikut:\n- ID Percakapan: ${conversation.id}\n- ID Lamaran: ${conversation.applicationId}\n- ID Proyek: ${conversation.projectId}\n- Judul Proyek: ${conversation.projectTitle}\n- Pelapor: ${currentUser.name} (${currentUser.role})\n\nDeskripsi Kendala:\n[Tuliskan kendala di sini...]`;
  const helpdeskMailto = `mailto:${HELPDESK_EMAIL}?subject=${encodeURIComponent(
    helpdeskSubject
  )}&body=${encodeURIComponent(helpdeskBody)}`;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* 1. THREAD HEADER */}
      <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shadow-2xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackClick}
              className="h-8 w-8 text-slate-600 rounded-xl hover:bg-slate-100"
              aria-label="Kembali ke daftar percakapan"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <Avatar
            src={conversation.otherPartyAvatar || undefined}
            fallback={conversation.otherPartyName.slice(0, 2).toUpperCase()}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full font-bold text-xs ring-1 ring-slate-200 bg-gradient-to-tr from-sky-500 to-blue-600 text-white shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-[#0F172A] truncate">
                {conversation.otherPartyName}
              </h2>
              <Badge
                variant="outline"
                className="text-3xs uppercase tracking-wider px-1.5 py-0 rounded-md font-bold text-slate-500 bg-slate-50 border-slate-200"
              >
                {conversation.otherPartyRole === "talent" ? "Talenta" : "Vendor"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-2xs text-slate-500 truncate mt-0.5">
              <span className="truncate">{conversation.projectTitle}</span>
              <span>•</span>
              <Badge
                variant={statusBadge.variant}
                className="text-3xs font-bold px-2 py-0.5 rounded-full"
              >
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right Header: Match Score (Vendor only) & Links */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser.role === "vendor" && conversation.matchScore != null && (
            <div className="hidden sm:flex items-center gap-1 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-xl text-3xs font-extrabold text-sky-800 shadow-2xs">
              <Sparkles className="h-3 w-3 text-sky-600" />
              <span>Match: {Math.round(conversation.matchScore)}%</span>
            </div>
          )}

          {currentUser.role === "talent" ? (
            <Link
              href={`/talent/projects/${conversation.projectId}`}
              className="hidden sm:inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-xl font-bold gap-1 text-slate-600 hover:text-sky-700"
              >
                <span>Lihat Proyek</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Link
              href={`/vendor/projects/${conversation.projectId}/applicants`}
              className="hidden sm:inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-xl font-bold gap-1 text-slate-600 hover:text-sky-700"
              >
                <span>Lihat Pelamar</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. FIXED SAFETY REMINDER BANNER */}
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-2xs text-amber-900 flex items-center justify-between gap-3 backdrop-blur-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="truncate">
            Demi keamanan, lakukan pembayaran dan kesepakatan fee melalui platform. Jangan membagikan data kartu atau password.
          </span>
        </div>
        <a
          href={helpdeskMailto}
          className="underline font-bold text-amber-800 hover:text-amber-950 shrink-0 text-3xs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Laporkan percakapan
        </a>
      </div>

      {/* 3. MESSAGES SCROLL CONTAINER */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-5 relative space-y-2"
      >
        {/* Load older messages button */}
        {hasMore && (
          <div className="flex justify-center pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="text-xs rounded-full bg-white shadow-2xs font-bold gap-1.5 h-8 px-4"
            >
              {isLoadingMore ? (
                <>
                  <RotateCw className="h-3 w-3 animate-spin" />
                  <span>Memuat pesan...</span>
                </>
              ) : (
                <span>Muat pesan lebih lama</span>
              )}
            </Button>
          </div>
        )}

        {/* Message Items grouped with Date Separators */}
        {messages.map((msg, index) => {
          const isMyMessage = msg.sender_id === currentUser.id;
          const isLatestMyMessage =
            isMyMessage &&
            index ===
              messages
                .map((m) => m.sender_id)
                .lastIndexOf(currentUser.id);

          const isReadByOther =
            Boolean(conversation.otherPartyLastReadAt) &&
            new Date(conversation.otherPartyLastReadAt!) >=
              new Date(msg.created_at);

          // Date Separator calculation
          const prevMsg = messages[index - 1];
          const showDateSeparator =
            !prevMsg ||
            new Date(prevMsg.created_at).toDateString() !==
              new Date(msg.created_at).toDateString();

          return (
            <div key={msg.id || index}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="rounded-full bg-slate-200/80 px-3 py-1 text-3xs font-bold text-slate-600 shadow-2xs">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}

              <ChatMessageItem
                message={msg}
                currentUserId={currentUser.id}
                isMyMessage={isMyMessage}
                isLatestMyMessage={isLatestMyMessage}
                isReadByOther={isReadByOther}
                otherPartyName={conversation.otherPartyName}
                onRetry={onRetryMessage}
                onMeetingStatusUpdated={onMeetingStatusUpdated}
              />
            </div>
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottomBtn && (
        <div className="absolute bottom-24 right-6 z-20">
          <Button
            size="sm"
            onClick={() => {
              scrollToBottom("smooth");
              setShowScrollBottomBtn(false);
            }}
            className="rounded-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-lg shadow-sky-600/30 gap-1.5 h-8 px-3.5 animate-bounce"
          >
            <span>Pesan baru</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* 4. READ-ONLY BANNER OR COMPOSER */}
      {!isAllowedToSend ? (
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 text-center">
          <Lock className="h-4 w-4 text-slate-500 shrink-0" />
          <span>{chatNotice || "Percakapan ini berada dalam mode hanya-baca."}</span>
        </div>
      ) : (
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shadow-lg relative">
          <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200/80 p-2 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
            {/* Plus Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-9 w-9 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center shrink-0"
                aria-label="Aksi tambahan pesan"
              >
                <Plus className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="left"
                className="w-52 bg-white rounded-2xl border-slate-100 shadow-xl p-1.5 text-xs font-semibold"
              >
                <DropdownMenuItem
                  onClick={() => setShowWhatsAppDialog(true)}
                  className="rounded-xl gap-2.5 p-2 text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 cursor-pointer"
                >
                  <MessageSquareShare className="h-4 w-4" />
                  <span>Bagikan WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowMeetingDialog(true)}
                  className="rounded-xl gap-2.5 p-2 text-sky-700 focus:bg-sky-50 focus:text-sky-800 cursor-pointer"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Jadwalkan Meeting</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Textarea Composer */}
            <div className="flex-1 min-w-0">
              <Textarea
                placeholder="Tulis pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                className="min-h-[38px] max-h-36 resize-none border-0 bg-transparent p-2 text-xs focus-visible:ring-0 shadow-none leading-relaxed"
              />
            </div>

            {/* Send Button */}
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || !inputText.trim()}
              className="h-9 w-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shrink-0 shadow-md shadow-sky-600/20 disabled:opacity-50"
              aria-label="Kirim pesan"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Character counter (tampil saat mendekati 2000 karakter) */}
          {inputText.length > 1500 && (
            <div className="flex justify-end text-3xs font-semibold text-slate-400 mt-1 mr-2">
              <span className={inputText.length >= 1950 ? "text-rose-600 font-bold" : ""}>
                {inputText.length}
              </span>
              <span>/2000</span>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <WhatsAppDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
        conversationId={conversation.id}
        onSuccess={() => scrollToBottom("smooth")}
      />

      <MeetingDialog
        open={showMeetingDialog}
        onOpenChange={setShowMeetingDialog}
        conversationId={conversation.id}
        onSuccess={() => scrollToBottom("smooth")}
      />
    </div>
  );
}
