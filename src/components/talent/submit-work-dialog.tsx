"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { submitWorkDocumentation } from "@/app/talent/applications/actions";
import { submitWorkDocumentationSchema } from "@/lib/validators/application";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SubmitWorkDialogProps {
  applicationId: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitWorkDialog({
  applicationId,
  projectTitle,
  isOpen,
  onClose,
  onSuccess,
}: SubmitWorkDialogProps) {
  const [links, setLinks] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = submitWorkDocumentationSchema.safeParse({
      submissionLinks: links.map((link) => link.trim()).filter(Boolean),
      submissionNotes: notes,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Periksa link hasil yang dikirim.");
      return;
    }

    startTransition(async () => {
      const result = await submitWorkDocumentation(
        applicationId,
        validation.data.submissionLinks,
        notes
      );
      if (!result.success) {
        toast.error(result.error || "Gagal mengirim hasil kerja.");
        return;
      }
      toast.success("Hasil kerja berhasil dikirim ke vendor.");
      setLinks([""]);
      setNotes("");
      onClose();
      onSuccess();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Kirim hasil pengerjaan</DialogTitle>
            <DialogDescription>{projectTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Link hasil kerja <span className="text-rose-600">Wajib</span></Label>
                <p className="mt-1 text-xs text-slate-500">Masukkan 1–5 link HTTP atau HTTPS.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={links.length >= 5}
                onClick={() => setLinks((current) => [...current, ""])}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah link
              </Button>
            </div>
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    id={`submission-url-${applicationId}-${index}`}
                    type="url"
                    inputMode="url"
                    value={link}
                    onChange={(event) =>
                      setLinks((current) =>
                        current.map((value, row) => (row === index ? event.target.value : value))
                      )
                    }
                    placeholder="https://..."
                    aria-label={`Link hasil ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={links.length === 1}
                    onClick={() => setLinks((current) => current.filter((_, row) => row !== index))}
                    aria-label={`Hapus link hasil ${index + 1}`}
                    className="h-9 w-9 shrink-0 text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`submission-notes-${applicationId}`}>Catatan untuk vendor (opsional)</Label>
            <Textarea
              id={`submission-notes-${applicationId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Jelaskan hasil atau bagian penting yang perlu diperiksa."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || links.every((link) => !link.trim())}>
              {isPending ? "Mengirim..." : "Kirim hasil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
