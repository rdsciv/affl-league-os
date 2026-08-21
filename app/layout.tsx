import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Anton, Archivo, IBM_Plex_Mono } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AFFL League OS",
    template: "%s · AFFL League OS",
  },
  description:
    "The AFFL control room, data atlas, and league archive. Every number verified, reconstructed, or explicitly unavailable.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/favicon-64.png` },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${anton.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
