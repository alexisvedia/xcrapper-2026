import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XCrapper",
  description: "Scrape, curate, and publish AI news tweets automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
