import type { Metadata, Viewport } from "next";
import "./globals.css";
import DifyChatbot from "@/components/DifyChatbot";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Học Ngôn Ngữ Ký Hiệu VSL",
  description:
    "Học ngôn ngữ ký hiệu Việt Nam — bật camera, ký hiệu, AI chấm đúng/sai ngay trong trình duyệt.",
  manifest: "/manifest.json",
  applicationName: "VSL Learn",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VSL Learn",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffd23f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <PWARegister />
      </body>
    </html>
  );
}
