"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteProjectDialog({
  isOpen,
  onClose,
  projectTitle,
  onConfirm,
  isDeleting,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-left text-[#4a3728]">
            Hapus Proyek Ini?
          </DialogTitle>
          <DialogDescription className="text-left text-[#7a6559]">
            Apakah Anda yakin ingin menghapus proyek{" "}
            <span className="font-semibold text-[#4a3728]">&ldquo;{projectTitle}&rdquo;</span>?
            Tindakan ini tidak dapat dibatalkan dan akan menghapus seluruh data lamaran terkait.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            isLoading={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Ya, Hapus Proyek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
