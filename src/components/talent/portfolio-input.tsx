"use client";

import * as React from "react";
import { Plus, Trash2, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PortfolioInputProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export function PortfolioInput({ urls, onChange }: PortfolioInputProps) {
  const [newUrl, setNewUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const isValidUrl = (str: string): boolean => {
    try {
      const parsed = new URL(str);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setUrlError("Format URL harus diawali dengan http:// atau https:// (mis. https://github.com/username)");
      return;
    }

    if (urls.includes(trimmed)) {
      setUrlError("Tautan ini sudah ada dalam daftar portofolio kamu.");
      return;
    }

    setUrlError(null);
    onChange([...urls, trimmed]);
    setNewUrl("");
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(urls.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Tautan Portofolio &amp; Proyek</Label>
        <span className="text-xs text-[#4A7AAF]">Maks. 5 tautan</span>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="https://github.com/... atau https://behance.net/..."
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value);
              if (urlError) setUrlError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="pl-9 text-sm"
          />
          <Globe className="absolute left-3 top-2.5 h-4 w-4 text-[#93C5FD] pointer-events-none" />
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          variant="secondary"
          size="default"
          className="gap-1.5 shrink-0 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] border border-[#BFDBFE]"
          disabled={!newUrl.trim() || urls.length >= 5}
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {urlError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{urlError}</span>
        </div>
      )}

      {/* List of URLs */}
      {urls.length > 0 ? (
        <div className="space-y-2 pt-1">
          {urls.map((url, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#BFDBFE] bg-[#F0F9FF] px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-medium text-[#1D4ED8] hover:text-[#1E40AF] hover:underline"
                >
                  {url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-[#93C5FD] hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                title="Hapus tautan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#4A7AAF] italic">
          Belum ada tautan portofolio yang ditambahkan. Tambahkan link GitHub, Figma, Behance, atau website pribadimu.
        </p>
      )}
    </div>
  );
}
