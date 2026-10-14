"use client";

import { useState } from "react";
import { CalendarDays, Clock, Video, MapPin, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { proposeMeeting } from "@/app/(chat)/actions";
import {
  meetingProposalSchema,
  type MeetingPlatform,
  type MeetingProposalInput,
} from "@/lib/chat";
import { toast } from "sonner";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSuccess?: () => void;
}

export function MeetingDialog({
  open,
  onOpenChange,
  conversationId,
  onSuccess,
}: MeetingDialogProps) {
  const [title, setTitle] = useState("");
  // Default waktu: besok pukul 10:00
  const getDefaultStartsAt = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [startsAt, setStartsAt] = useState(getDefaultStartsAt);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [platform, setPlatform] = useState<MeetingPlatform>("google_meet");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Konversi startsAt ke ISO string
    let isoStartsAt = "";
    try {
      isoStartsAt = new Date(startsAt).toISOString();
    } catch {
      setError("Waktu pelaksanaan meeting tidak valid.");
      return;
    }

    const payload: MeetingProposalInput = {
      title: title.trim(),
      startsAt: isoStartsAt,
      durationMinutes: Number(durationMinutes),
      platform,
      link: link.trim() || undefined,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
    };

    const validation = meetingProposalSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Data meeting tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await proposeMeeting(conversationId, validation.data);
      if (!res.success) {
        setError(res.error || "Gagal mengajukan meeting.");
        return;
      }

      toast.success("Usulan meeting berhasil dikirim.");
      setTitle("");
      setLink("");
      setLocation("");
      setNote("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengajukan meeting."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-slate-900 border-sky-100 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <CalendarDays className="h-6 w-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-lg font-black text-[#0F172A] tracking-tight">
            Jadwalkan Meeting Proyek
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Ajukan usulan jadwal diskusi langsung. Lawan bicaramu dapat mengonfirmasi atau menolak.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="meeting-title" className="text-xs font-bold text-slate-700">
              Agenda / Judul Meeting <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="meeting-title"
              placeholder="Contoh: Diskusi Teknis & Pembagian Modul"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              maxLength={80}
              className="text-xs rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-time" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                <span>Waktu Pelaksanaan</span> <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="meeting-time"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value);
                  setError(null);
                }}
                className="text-xs rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meeting-duration" className="text-xs font-bold text-slate-700">
                Durasi
              </Label>
              <Select
                id="meeting-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="text-xs h-10 rounded-xl border-slate-200 bg-white"
              >
                <option value="15">15 menit</option>
                <option value="30">30 menit</option>
                <option value="45">45 menit</option>
                <option value="60">1 jam (60 mnt)</option>
                <option value="90">1.5 jam (90 mnt)</option>
                <option value="120">2 jam (120 mnt)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-platform" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Video className="h-3.5 w-3.5 text-sky-600" />
              <span>Platform / Mode</span>
            </Label>
            <Select
              id="meeting-platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as MeetingPlatform);
                setError(null);
              }}
              className="text-xs h-10 rounded-xl border-slate-200 bg-white"
            >
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="offline">Tatap Muka (Offline)</option>
              <option value="other">Lainnya</option>
            </Select>
          </div>

          {platform === "offline" ? (
            <div className="space-y-1.5">
              <Label htmlFor="meeting-location" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Lokasi Tatap Muka</span> <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="meeting-location"
                placeholder="Contoh: Gedung R&D Lt. 3, Jakarta Selatan"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setError(null);
                }}
                maxLength={200}
                className="text-xs rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="meeting-link" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-sky-600" />
                <span>Tautan Meeting (Opsional)</span>
              </Label>
              <Input
                id="meeting-link"
                placeholder="https://meet.google.com/xyz atau https://zoom.us/j/..."
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setError(null);
                }}
                className="text-xs rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="meeting-note" className="text-xs font-bold text-slate-700">
              Catatan / Agenda Tambahan (Opsional)
            </Label>
            <Textarea
              id="meeting-note"
              placeholder="Hal yang perlu dipersiapkan sebelum meeting..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={300}
              className="text-xs rounded-xl border-slate-200 resize-none focus:border-sky-500 focus:ring-sky-500/20"
            />
            <div className="flex justify-end text-3xs text-slate-400">
              {note.length} / 300
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
            >
              {isSubmitting ? "Mengajukan..." : "Ajukan Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
