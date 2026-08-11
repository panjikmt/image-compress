import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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

const SITE_URL = "https://kompres.web.id";
const SITE_NAME = "kompres.web.id";
const TITLE = "kompres.web.id — Compress & Convert Images Online (Free, Private)";
const DESCRIPTION =
  "Compress and convert images to PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF or GIF right in your browser. 100% private — no uploads, no watermarks. Free online image compressor.";
const KEYWORDS = [
  "image compressor",
  "compress image online",
  "image converter",
  "webp converter",
  "png compressor",
  "jpg compressor",
  "heic to jpg",
  "avif converter",
  "reduce image size",
  "compress png",
  "compress jpg",
  "tinypng alternative",
  "free image optimizer",
  "batch image compressor",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · kompres.web.id",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: "kompres.web.id", url: SITE_URL }],
  creator: "kompres.web.id",
  publisher: "kompres.web.id",
  category: "Multimedia",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "kompres.web.id — Compress & Convert Images Online",
    description:
      "Compress and convert images in your browser. Private, fast, and free — no uploads, no watermarks.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "kompres.web.id — free in-browser image compressor & converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "kompres.web.id — Compress & Convert Images Online",
    description:
      "Compress and convert images in your browser. Private, fast, and free — no uploads.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  colorScheme: "light dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any (web browser)",
  browserRequirements: "Requires a modern web browser with JavaScript enabled.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Compress PNG, JPG, WebP, AVIF, GIF images",
    "Convert between PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF, GIF",
    "Batch processing and ZIP download",
    "100% client-side — files never leave your device",
  ],
  isAccessibleForFree: true,
  image: `${SITE_URL}/og-image.png`,
  logo: `${SITE_URL}/logo.svg`,
};

// Matomo analytics (Sentrasoft)
const MATOMO_URL = "//analytics.sentrasoft.co.id/";
const MATOMO_SITE_ID = "7";

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
        <Script id="ld-json" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
        {/* Matomo */}
        <Script id="matomo-analytics" strategy="afterInteractive">
          {`
            var _paq = window._paq = window._paq || [];
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);
            (function() {
              var u = "${MATOMO_URL}";
              _paq.push(['setTrackerUrl', u+'matomo.php']);
              _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
              var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
              g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
