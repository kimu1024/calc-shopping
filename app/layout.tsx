import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "おはなマート｜たしざん・おつりゲーム",
  description: "おみせやさんごっこで、2けた・3けたのたしざんとおつりの計算に親しむゲームです。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "おはなマート｜たしざん・おつりゲーム",
    description: "おみせやさんごっこで、たしざんとおつりにチャレンジ！",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "おはなマート" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "おはなマート",
    description: "おみせやさんごっこで、たしざんとおつりにチャレンジ！",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
