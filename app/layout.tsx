import type { Metadata } from "next";
import "./globals.css";
import { messages } from "@/contents/messages/en/message";

export const metadata: Metadata = {
  title: messages.meta.title,
  description: messages.meta.desc,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}