import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Hafiportrait",
  description: "Login to Hafiportrait photography platform admin dashboard.",
  robots: {
    index: false, // Don't index login page
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
