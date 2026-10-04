import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk ke Akun",
  description: "Masuk ke platform MatchWork AI untuk mulai matchmaking proyek dan talenta.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
