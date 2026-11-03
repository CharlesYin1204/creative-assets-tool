import "./globals.css";
import "./studio.css";
import "./completion.css";
import "./mobile.css";
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata = {
  title: "ShareCreators · 游戏美术协作空间",
  description: "从灵感到交付，让每一份创作成为可复用的资产。",
};
export default function Layout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
