import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "生成AI活用診断 | SHIN",
  description: "企業向け生成AI活用診断サービス",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-[#F5F8FC] text-shin-charcoal">{children}</body>
    </html>
  );
}
