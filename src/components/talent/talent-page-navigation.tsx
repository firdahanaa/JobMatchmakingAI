"use client";

import Link from "next/link";
import {
  CircleUser,
  ClipboardList,
  House,
  Search,
  type LucideIcon,
} from "lucide-react";

type TalentPage = "dashboard" | "projects" | "applications" | "profile";

const navigationItems: {
  href: string;
  label: string;
  page: TalentPage;
  Icon: LucideIcon;
  iconColor: string;
}[] = [
  {
    href: "/talent/dashboard",
    label: "Dashboard",
    page: "dashboard",
    Icon: House,
    iconColor: "text-sky-600",
  },
  {
    href: "/talent/projects",
    label: "Jelajahi Proyek",
    page: "projects",
    Icon: Search,
    iconColor: "text-sky-600",
  },
  {
    href: "/talent/applications",
    label: "Lamaran Saya",
    page: "applications",
    Icon: ClipboardList,
    iconColor: "text-blue-600",
  },
  {
    href: "/talent/profile",
    label: "Profil Saya",
    page: "profile",
    Icon: CircleUser,
    iconColor: "text-emerald-600",
  },
];

export function TalentPageNavigation({ activePage }: { activePage: TalentPage }) {
  return (
    <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-2">
      {navigationItems.map(({ href, label, page, Icon, iconColor }) => {
        const isActive = activePage === page;

        return (
          <Link
            key={page}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`group inline-flex h-12 w-12 shrink-0 items-center justify-start gap-3 overflow-hidden rounded-2xl border px-3 transition-[width,background-color,border-color,box-shadow] duration-300 ease-out hover:z-10 hover:w-44 hover:shadow-lg focus-visible:z-10 focus-visible:w-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 motion-reduce:transition-none ${
              isActive
                ? "border-sky-200 bg-white shadow-md shadow-sky-100/70"
                : "border-sky-400/70 bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm hover:border-sky-200"
            }`}
          >
            <Icon
              aria-hidden="true"
              className={`h-5 w-5 shrink-0 ${isActive ? iconColor : "text-white"}`}
            />
            <span
              aria-hidden="true"
              className={`-translate-x-1 whitespace-nowrap text-sm font-bold opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none ${
                isActive ? "text-sky-700" : "text-white"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
