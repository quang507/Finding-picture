import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Học Ngôn Ngữ Ký Hiệu VSL",
  description:
    "Học ngôn ngữ ký hiệu Việt Nam — bật camera, ký hiệu, AI chấm đúng/sai ngay trong trình duyệt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
