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
        <Label>Tautan Portofolio & Proyek</Label>
        <span className="text-xs text-slate-500">Maks. 5 tautan</span>
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
          <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          variant="secondary"
          size="default"
          className="gap-1.5 shrink-0"
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
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-medium text-slate-700 hover:text-purple-700 hover:underline"
                >
                  {url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                title="Hapus tautan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">
          Belum ada tautan portofolio yang ditambahkan. Tambahkan link GitHub, Figma, Behance, atau website pribadimu.
        </p>
      )}
    </div>
  );
}
