import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking | Hafiportrait",
  description: "Book your photography session with Hafiportrait.",
  robots: {
    index: false, // Booking form should not be indexed
    follow: false,
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
