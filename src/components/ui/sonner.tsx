"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#4a3728] group-[.toaster]:border-[#e8d5d0] group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-[#f8fafc] dark:group-[.toaster]:text-[#4a3728] dark:group-[.toaster]:border-[#e8d5d0]",
          description: "group-[.toast]:text-[#8a7668] dark:group-[.toast]:text-[#a89080]",
          actionButton:
            "group-[.toast]:bg-[#C98B75] group-[.toast]:text-white dark:group-[.toast]:bg-[#C98B75]",
          cancelButton:
            "group-[.toast]:bg-[#F7ECEA] group-[.toast]:text-[#8a7668] dark:group-[.toast]:bg-[#5c4639] dark:group-[.toast]:text-[#a89080]",
        },
      }}
      {...props}
    />
  );
}
