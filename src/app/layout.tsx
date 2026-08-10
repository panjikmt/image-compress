import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TinyForge — Smart Image Compression & Conversion",
  description: "Compress and convert images (PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF) directly in your browser. Private, fast, and free — no uploads.",
  keywords: ["image compression", "image converter", "tinypng", "webp", "heic", "png compressor", "jpg compressor"],
  authors: [{ name: "TinyForge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "TinyForge — Smart Image Compression",
    description: "Compress & convert images in your browser. Private, fast, free.",
    siteName: "TinyForge",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
