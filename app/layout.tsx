import type { Metadata, Viewport } from "next"
import { Space_Grotesk } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: "#deff9a",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: "OMNI-NEXUS",
  description: "Système souverain de commande et contrôle",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OMNI-NEXUS",
  },
  icons: {
    icon: [
      { url: "/icons/icon-16.png",  sizes: "16x16",   type: "image/png" },
      { url: "/icons/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-57.png",  sizes: "57x57"   },
      { url: "/icons/icon-72.png",  sizes: "72x72"   },
      { url: "/icons/icon-114.png", sizes: "114x114" },
      { url: "/icons/icon-120.png", sizes: "120x120" },
      { url: "/icons/icon-144.png", sizes: "144x144" },
      { url: "/icons/icon-152.png", sizes: "152x152" },
      { url: "/icons/icon-180.png", sizes: "180x180" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} dark bg-background`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
