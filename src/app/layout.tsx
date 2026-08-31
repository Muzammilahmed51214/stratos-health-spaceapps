import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StratosHealth | Emergency Response Air Quality Command Center",
  description:
    "Live air quality monitoring and emergency response dashboard. Integrates NASA TEMPO, EPA AirNow, and NASA SEDAC vulnerability data for wildfire impact assessment.",
  keywords: [
    "NASA",
    "TEMPO",
    "air quality",
    "wildfire",
    "emergency response",
    "command center",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-obsidian text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
