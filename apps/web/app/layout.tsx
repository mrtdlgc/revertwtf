import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const googleAnalyticsId = "G-WN3B4Y4KF0";
const title = "revert.wtf - EVM error explanations";
const description =
  "Paste a revert, RPC error, wallet failure, simulation trace, ERC-4337 error, or x402 payload. revert.wtf explains what it likely means and what to check next.";
const ogDescription = "EVM errors should not be this vague.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "revert.wtf",
  metadataBase: new URL("https://revert.wtf"),
  openGraph: {
    title: "revert.wtf",
    description: ogDescription,
    url: "https://revert.wtf",
    siteName: "revert.wtf",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "revert.wtf social card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: ogDescription,
    images: ["/twitter-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="site-shell">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
