import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guess Who · A Storytelling Party Game",
  description:
    "Anonymous answers. Live guessing. The stories behind each one. A small-group party game for fellowships, families, and teams.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0D0D2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Didact+Gothic&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-ivory)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-ui)",
            },
          }}
        />
      </body>
    </html>
  );
}
