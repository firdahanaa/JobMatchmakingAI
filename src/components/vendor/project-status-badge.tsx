import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/types/database";

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  switch (status) {
    case "open":
      return (
        <Badge
          variant="success"
          className={`bg-emerald-100 text-emerald-800 border-emerald-200 ${className || ""}`}
        >
          ● Terbuka (Open)
        </Badge>
      );
    case "draft":
      return (
        <Badge
          variant="outline"
          className={`bg-[#F7ECEA] text-[#695449] border-[#d4b0a5] ${className || ""}`}
        >
          Draft
        </Badge>
      );
    case "in_progress":
      return (
        <Badge
          variant="default"
          className={`bg-blue-100 text-blue-800 border-blue-200 ${className || ""}`}
        >
          Sedang Berjalan
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="default"
          className={`bg-[#F7ECEA] text-[#a66d5a] border-[#e0c4bc] ${className || ""}`}
        >
          Selesai (Completed)
        </Badge>
      );
    case "closed":
      return (
        <Badge
          variant="secondary"
          className={`bg-rose-100 text-rose-800 border-rose-200 ${className || ""}`}
        >
          Ditutup (Closed)
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}
