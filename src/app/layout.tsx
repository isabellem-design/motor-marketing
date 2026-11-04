import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motor de Marketing — Painel de Produção",
  description:
    "Acompanhamento simples e intuitivo do briefing até a peça pronta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f4f7fe] text-[#1b254b] antialiased">
        {children}
      </body>
    </html>
  );
}
