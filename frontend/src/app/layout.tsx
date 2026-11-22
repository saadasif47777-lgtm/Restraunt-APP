import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Tablelane | Restaurant workspace",
  description: "Restaurant menu and service management",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
