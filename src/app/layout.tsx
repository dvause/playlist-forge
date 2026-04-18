import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playlist Shuffler",
  description: "Shuffle, sort, and manage your music playlists on Spotify and YouTube",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
