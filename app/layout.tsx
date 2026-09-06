import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "バラマート｜たしざん・おつりゲーム",
  description: "おみせやさんごっこで、2けた・3けたのたしざんとおつりの計算に親しむゲームです。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "バラマート｜たしざん・おつりゲーム",
    description: "おみせやさんごっこで、たしざんとおつりにチャレンジ！",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "バラマート",
    description: "おみせやさんごっこで、たしざんとおつりにチャレンジ！",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
