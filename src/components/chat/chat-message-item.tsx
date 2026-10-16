"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Download,
  Info,
  MessageSquareShare,
  Check,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { linkify, buildIcs, type MeetingPlatform } from "@/lib/chat";
import {
  formatMessageTime,
  formatMeetingDateTime,
} from "./chat-date-utils";
import { respondToMeeting } from "@/app/(chat)/actions";
import type { Message } from "@/types/database";
import { toast } from "sonner";

export interface ExtendedMessage extends Message {
  isOptimistic?: boolean;
  isFailed?: boolean;
}

interface ChatMessageItemProps {
  message: ExtendedMessage;
  currentUserId: string;
  isMyMessage: boolean;
  isLatestMyMessage: boolean;
  isReadByOther: boolean;
  otherPartyName: string;
  onRetry?: (message: ExtendedMessage) => void;
  onMeetingStatusUpdated?: (messageId: string, status: "confirmed" | "declined") => void;
}

export function ChatMessageItem({
  message,
  currentUserId,
  isMyMessage,
  isLatestMyMessage,
  isReadByOther,
  otherPartyName,
  onRetry,
  onMeetingStatusUpdated,
}: ChatMessageItemProps) {
  const [isResponding, setIsResponding] = useState(false);

  // 1. PESAN SISTEM
  if (message.kind === "system") {
    return (
      <div className="flex justify-center my-3 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/70 px-4 py-1.5 text-2xs font-medium text-slate-600 shadow-2xs">
          <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <span className="leading-snug text-center">{message.body}</span>
        </div>
      </div>
    );
  }

  // Handle Download .ics
  const handleDownloadIcs = () => {
    try {
      const meta = (message.metadata || {}) as Record<string, unknown>;
      const icsString = buildIcs(
        {
          title: (meta.title as string) || "Meeting Proyek",
          startsAt: (meta.startsAt as string) || message.created_at,
          durationMinutes: Number(meta.durationMinutes || 30),
          platform: (meta.platform as MeetingPlatform) || "google_meet",
          link: (meta.link as string) || undefined,
          location: (meta.location as string) || undefined,
          note: (meta.note as string) || undefined,
        },
        otherPartyName
      );

      const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${Date.now()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("File kalender (.ics) berhasil diunduh.");
    } catch {
      toast.error("Gagal mengunduh file kalender.");
    }
  };

  // Handle Konfirmasi/Tolak Meeting
  const handleMeetingResponse = async (status: "confirmed" | "declined") => {
    setIsResponding(true);
    try {
      const res = await respondToMeeting(message.id, status);
      if (!res.success) {
        toast.error(res.error || "Gagal merespons meeting.");
        return;
      }

      toast.success(
        status === "confirmed"
          ? "Meeting berhasil dikonfirmasi."
          : "Meeting telah ditolak."
      );
      onMeetingStatusUpdated?.(message.id, status);
    } catch {
      toast.error("Terjadi kesalahan saat memproses respon meeting.");
    } finally {
      setIsResponding(false);
    }
  };

  const metadata = (message.metadata || {}) as Record<string, unknown>;

  return (
    <div
      className={`flex flex-col my-1.5 ${
        isMyMessage ? "items-end" : "items-start"
      }`}
    >
      {/* Sender name for other party */}
      {!isMyMessage && (
        <span className="text-3xs font-bold text-slate-400 mb-1 ml-1">
          {message.sender?.full_name || otherPartyName}
        </span>
      )}

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 sm:p-4 text-xs transition-all ${
          isMyMessage
            ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-xs shadow-md shadow-sky-600/15"
            : "bg-white text-slate-800 border border-slate-100 rounded-bl-xs shadow-xs"
        } ${message.isFailed ? "border-rose-300 bg-rose-50/90 text-rose-900" : ""}`}
      >
        {/* A. TEXT MESSAGE */}
        {message.kind === "text" && (
          <div className="leading-relaxed whitespace-pre-wrap break-words font-normal">
            {linkify(message.body).map((segment, idx) =>
              segment.type === "link" ? (
                <a
                  key={idx}
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`underline font-semibold break-all ${
                    isMyMessage
                      ? "text-sky-200 hover:text-white"
                      : "text-sky-600 hover:text-sky-700"
                  }`}
                >
                  {segment.content}
                </a>
              ) : (
                <span key={idx}>{segment.content}</span>
              )
            )}
          </div>
        )}

        {/* B. CONTACT / WHATSAPP CARD */}
        {message.kind === "contact" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-bold">
              <div
                className={`p-1.5 rounded-lg ${
                  isMyMessage ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <MessageSquareShare className="h-4 w-4" />
              </div>
              <span>Kontak WhatsApp Dibagikan</span>
            </div>

            <div
              className={`p-2.5 rounded-xl text-xs font-mono font-bold ${
                isMyMessage
                  ? "bg-white/10 text-white border border-white/15"
                  : "bg-emerald-50/70 text-emerald-950 border border-emerald-100"
              }`}
            >
              +{metadata.number as string}
            </div>

            {Boolean(metadata.note) && (
              <p
                className={`text-2xs italic leading-relaxed ${
                  isMyMessage ? "text-sky-100" : "text-slate-500"
                }`}
              >
                &ldquo;{String(metadata.note)}&rdquo;
              </p>
            )}

            <div className="pt-1">
              <a
                href={
                  (metadata.link as string) ||
                  `https://wa.me/${metadata.number}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full"
              >
                <Button
                  size="sm"
                  className={`w-full text-xs font-bold gap-1.5 rounded-xl ${
                    isMyMessage
                      ? "bg-white text-sky-700 hover:bg-sky-50 shadow-sm"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25"
                  }`}
                >
                  <span>Buka WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* C. MEETING CARD */}
        {message.kind === "meeting" && (
          <div className="space-y-3 min-w-[220px]">
            {/* Header Meeting & Status Badge */}
            <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="h-4 w-4" />
                <span className="line-clamp-1">
                  {(metadata.title as string) || "Usulan Meeting"}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  metadata.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : metadata.status === "declined"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : "bg-amber-100 text-amber-900 border-amber-200"
                }`}
              >
                {metadata.status === "confirmed"
                  ? "Dikonfirmasi"
                  : metadata.status === "declined"
                  ? "Ditolak"
                  : "Diusulkan"}
              </Badge>
            </div>

            {/* Info Waktu, Durasi & Lokasi/Platform */}
            <div className="space-y-1.5 text-2xs leading-snug">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 opacity-75 shrink-0" />
                <span>
                  {formatMeetingDateTime(
                    (metadata.startsAt as string) || message.created_at
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Video className="h-3 w-3 opacity-75 shrink-0" />
                <span className="capitalize">
                  {metadata.platform === "offline"
                    ? "Tatap Muka"
                    : String(metadata.platform || "Online").replace("_", " ")}{" "}
                  ({String(metadata.durationMinutes || 30)} menit)
                </span>
              </div>
              {Boolean(metadata.location) && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 opacity-75 shrink-0 mt-0.5" />
                  <span>{String(metadata.location)}</span>
                </div>
              )}
              {Boolean(metadata.note) && (
                <p className="pt-1 italic opacity-85">
                  &ldquo;{String(metadata.note)}&rdquo;
                </p>
              )}
            </div>

            {/* Meeting Actions: Konfirmasi / Tolak / Download / Gabung */}
            <div className="pt-2 flex flex-col gap-1.5 border-t border-black/10">
              {metadata.status === "proposed" && (
                <>
                  {metadata.proposedBy === currentUserId ? (
                    <span className="text-3xs italic opacity-80 text-center">
                      Menunggu konfirmasi lawan bicara...
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMeetingResponse("confirmed")}
                        disabled={isResponding}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Konfirmasi</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMeetingResponse("declined")}
                        disabled={isResponding}
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl h-8 gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Tolak</span>
                      </Button>
                    </div>
                  )}
                </>
              )}

              {metadata.status === "confirmed" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadIcs}
                    className={`flex-1 text-xs font-bold rounded-xl h-8 gap-1.5 ${
                      isMyMessage
                        ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Download className="h-3 w-3" />
                    <span>Simpan Kalender</span>
                  </Button>
                  {Boolean(metadata.link) && (
                    <a
                      href={metadata.link as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full text-xs font-bold rounded-xl h-8 gap-1 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                      >
                        <span>Gabung Meeting</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Timestamp, Retry & Read Marker */}
      <div className="flex items-center gap-1.5 mt-1 px-1 text-3xs text-slate-400">
        <span>{formatMessageTime(message.created_at)}</span>

        {message.isOptimistic && (
          <span className="italic text-sky-500">Mengirim...</span>
        )}

        {message.isFailed && (
          <button
            onClick={() => onRetry?.(message)}
            className="flex items-center gap-1 text-rose-600 font-bold hover:underline"
          >
            <RotateCw className="h-2.5 w-2.5" />
            <span>Gagal. Coba lagi</span>
          </button>
        )}

        {isMyMessage && isLatestMyMessage && !message.isOptimistic && !message.isFailed && (
          <span className="inline-flex items-center gap-0.5 font-semibold">
            {isReadByOther ? (
              <span className="text-sky-600 flex items-center gap-0.5">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span className="text-[10px]">Dibaca</span>
              </span>
            ) : (
              <Check className="h-3 w-3 text-slate-300 stroke-[2]" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
