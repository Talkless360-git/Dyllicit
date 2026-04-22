import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { AuthProvider } from "@/providers/AuthProvider";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "ChainStream — Blockchain Streaming Platform",
  description: "Web3 music and video streaming with NFT ownership and royalty distribution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
          <Web3Provider>
            <AppLayout>
              {children}
            </AppLayout>
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
