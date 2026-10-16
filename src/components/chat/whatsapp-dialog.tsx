"use client";

import { useState } from "react";
import { MessageSquareShare, AlertCircle, Phone } from "lucide-react";
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
import { shareWhatsApp } from "@/app/(chat)/actions";
import { normalizeWhatsAppNumber } from "@/lib/chat";
import { toast } from "sonner";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSuccess?: () => void;
}

export function WhatsAppDialog({
  open,
  onOpenChange,
  conversationId,
  onSuccess,
}: WhatsAppDialogProps) {
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      normalizeWhatsAppNumber(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nomor WhatsApp tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await shareWhatsApp(conversationId, number, note);
      if (!res.success) {
        setError(res.error || "Gagal membagikan kontak WhatsApp.");
        return;
      }

      toast.success("Kontak WhatsApp berhasil dibagikan.");
      setNumber("");
      setNote("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat membagikan kontak."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-slate-900 border-sky-100 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <MessageSquareShare className="h-6 w-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-lg font-black text-[#0F172A] tracking-tight">
            Bagikan Kontak WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Berikan kontak WhatsApp untuk mempermudah komunikasi langsung terkait proyek.
          </DialogDescription>
        </DialogHeader>

        {/* Security / Consent Disclaimer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Konfirmasi Privasi</p>
            <p className="text-2xs text-amber-800 leading-relaxed">
              Nomor ini akan terlihat oleh lawan bicaramu. Bagikan hanya jika kamu nyaman.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wa-number" className="text-xs font-bold text-slate-700">
              Nomor WhatsApp <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="wa-number"
                placeholder="08123456789 atau +628123456789"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setError(null);
                }}
                className="pl-10 text-xs rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500/20"
                required
              />
            </div>
            <p className="text-3xs text-slate-400">
              Format: 08xx, +628xx, atau 628xx (10–15 digit)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-note" className="text-xs font-bold text-slate-700">
              Catatan Singkat (Opsional)
            </Label>
            <Textarea
              id="wa-note"
              placeholder="Contoh: Silakan hubungi saya pada jam kerja (09.00 - 17.00 WIB)"
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
              disabled={isSubmitting || !number.trim()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? "Membagikan..." : "Bagikan Nomor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
