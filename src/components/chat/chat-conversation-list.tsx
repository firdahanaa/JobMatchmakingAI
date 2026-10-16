"use client";

import { useState } from "react";
import { Search, MessageSquare, Briefcase } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getApplicationStatusBadge } from "@/lib/workflow/transitions";
import { formatRelativeTime } from "./chat-date-utils";
import type { ConversationListItem } from "@/app/(chat)/queries";

interface ChatConversationListProps {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

export function ChatConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
}: ChatConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.otherPartyName.toLowerCase().includes(q) ||
      c.projectTitle.toLowerCase().includes(q) ||
      (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Header Panel Daftar Percakapan */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h1 className="text-base font-black text-[#0F172A] tracking-tight">
              Pesan & Diskusi
            </h1>
          </div>
          <span className="text-3xs font-extrabold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {conversations.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari percakapan atau proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-sky-500/20"
          />
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 animate-pulse"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-slate-200 rounded" />
                  <div className="h-2.5 w-40 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 mb-3 border border-slate-100">
              <MessageSquare className="h-6 w-6 stroke-1 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 mb-1">
              {searchQuery ? "Tidak ada percakapan cocok" : "Belum ada percakapan"}
            </p>
            <p className="text-2xs text-slate-500 max-w-xs leading-relaxed">
              {searchQuery
                ? "Coba gunakan kata kunci pencarian yang lain."
                : "Percakapan dibuat otomatis saat kamu melamar proyek atau saat ada pelamar baru."}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isActive = item.id === activeConversationId;
            const statusBadge = getApplicationStatusBadge(item.applicationStatus);

            return (
              <button
                key={item.id}
                onClick={() => onSelectConversation(item.id)}
                className={`w-full text-left p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                  isActive
                    ? "bg-sky-50/90 border-r-4 border-sky-600"
                    : "hover:bg-slate-50/80"
                }`}
              >
                {/* Avatar */}
                <Avatar
                  src={item.otherPartyAvatar || undefined}
                  fallback={item.otherPartyName.slice(0, 2).toUpperCase()}
                  className="h-10 w-10 shrink-0 rounded-full font-bold text-xs ring-1 ring-slate-200/80 bg-gradient-to-tr from-sky-500 to-blue-600 text-white"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <span className="font-bold text-xs text-[#0F172A] truncate">
                      {item.otherPartyName}
                    </span>
                    <span className="text-3xs text-slate-400 shrink-0 font-medium">
                      {formatRelativeTime(item.lastMessageAt)}
                    </span>
                  </div>

                  {/* Project Title */}
                  <div className="flex items-center gap-1 text-2xs text-slate-500 truncate mb-1">
                    <Briefcase className="h-3 w-3 text-sky-600 shrink-0" />
                    <span className="truncate font-medium">{item.projectTitle}</span>
                  </div>

                  {/* Last Message Preview */}
                  <p className="text-xs text-slate-500 truncate leading-relaxed">
                    {item.lastMessagePreview || "Percakapan baru dibuka."}
                  </p>

                  {/* Badges Footer */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60">
                    <Badge
                      variant={statusBadge.variant}
                      className="text-3xs font-bold px-2 py-0.5 rounded-full"
                    >
                      {statusBadge.label}
                    </Badge>

                    {item.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-3xs font-black text-white shadow-xs">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
