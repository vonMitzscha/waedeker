import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  metadataBase: new URL("https://waedeker.netzgewoelbe.com"),
  title: "Waedeker",
  description:
    "Das Wissen von Wikipedia im handlichen Baedeker-Format. Erstelle ein kompaktes offline verwendbares Wikipedia-Archiv als ZIM-Datei für jede beliebige Region der Welt.",
  openGraph: {
    title: "Waedeker",
    description:
      "Erstelle ein maßgeschneidertes Wikipedia-Archiv als ZIM-Datei – offline nutzbar auf Wanderungen, Expeditionen und in Gebieten ohne Netzabdeckung.",
    url: "https://waedeker.netzgewoelbe.com",
    siteName: "Waedeker",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Waedeker – Das Wissen von Wikipedia im handlichen Baedeker-Format",
      },
      {
        url: "/og-square.png",
        width: 1200,
        height: 1200,
        alt: "Waedeker – Das Wissen von Wikipedia im handlichen Baedeker-Format",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Waedeker",
    description:
      "Erstelle ein maßgeschneidertes Wikipedia-Archiv als ZIM-Datei – offline nutzbar auf Wanderungen, Expeditionen und in Gebieten ohne Netzabdeckung.",
    images: ["/twitter-card.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/favicon-180x180.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://a.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://b.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://c.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
      </head>
      <body><ClientProviders>{children}</ClientProviders></body>
    </html>
  );
}
