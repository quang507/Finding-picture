import type { Metadata } from "next";
import "./globals.css";
import DifyChatbot from "@/components/DifyChatbot";

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
      <body>
        {children}
        <DifyChatbot />
      </body>
    </html>
  );
}
