// src/app/layout.tsx
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"] });

export const metadata = {
  title: "XRP Wallet retriever",
  description:
    "A simple tool to retrieve XRP wallets from a list of mnemonic phrases.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${raleway.className} min-h-screen bg-teal-50`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
