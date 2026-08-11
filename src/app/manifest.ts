import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kompres.web.id — Image Compressor & Converter",
    short_name: "kompres",
    description:
      "Compress and convert images in your browser. Private, fast, and free — no uploads.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4F46E5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
