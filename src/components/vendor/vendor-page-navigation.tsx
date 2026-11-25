"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Building2,
  UserCog,
  MailPlus,
  Settings,
} from "lucide-react";

export type VendorNavigationKey =
  | "dashboard"
  | "vacancies"
  | "create"
  | "applicants"
  | "profile"
  | "team"
  | "invitations"
  | "settings";

interface VendorPageNavigationProps {
  activePage: VendorNavigationKey;
}

const VENDOR_NAV_ITEMS: {
  key: VendorNavigationKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "vacancies",
    label: "My Vacancies",
    href: "/vendor/dashboard#my-vacancies",
    icon: Briefcase,
  },
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/vendor/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "create",
    label: "Create Vacancy",
    href: "/vendor/projects/new",
    icon: PlusCircle,
  },
  {
    key: "profile",
    label: "Company Profile",
    href: "/vendor/profile",
    icon: Building2,
  },
  {
    key: "team",
    label: "Team Management",
    href: "/vendor/team",
    icon: UserCog,
  },
  {
    key: "invitations",
    label: "Invitations",
    href: "/vendor/invitations",
    icon: MailPlus,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/vendor/settings",
    icon: Settings,
  },
];

export function VendorPageNavigation({ activePage }: VendorPageNavigationProps) {
  const effectiveActiveKey = activePage === "applicants" ? "vacancies" : activePage;

  return (
    <nav
      aria-label="Navigasi Workspace HR & Perusahaan"
      className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-[#e8d5d0] bg-white/90 p-1.5 shadow-2xs"
    >
      {VENDOR_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = effectiveActiveKey === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              isActive
                ? "bg-[#b87a65] text-white shadow-sm"
                : "text-[#695449] hover:bg-[#F7ECEA] hover:text-[#4a3728]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
