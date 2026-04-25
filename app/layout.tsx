import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://guesswho-delta.vercel.app";

const TITLE = "Guess Who · A Storytelling Party Game";
const DESCRIPTION =
  "Anonymous answers. Live guessing. The stories behind each one. A small-group storytelling party game for fellowships, families, and teams. No app to install — runs in any browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Guess Who",
  },
  description: DESCRIPTION,
  applicationName: "Guess Who",
  authors: [{ name: "Guess Who" }],
  creator: "Guess Who",
  publisher: "Guess Who",
  keywords: [
    "party game",
    "storytelling game",
    "icebreaker",
    "fellowship game",
    "family game",
    "team game",
    "small group",
    "guess who",
    "trivia",
    "anonymous answers",
  ],
  category: "games",
  alternates: {
    canonical: "/",
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
  openGraph: {
    type: "website",
    siteName: "Guess Who",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: "Guess Who",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark",
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
