import { env } from "@/env";
import { AnalyticsLoader } from "@/modules/common/components/AnalyticsLoader";
import ToasterContainer from "@/modules/common/components/ToasterContainer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import clsx from "clsx";
import { type Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Roboto_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";

const robotMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.BASE_URL),
  title: {
    default: "S.A.M. - Sinister Incorporated",
    template: "%s | S.A.M. - Sinister Incorporated",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} style={{ scrollPaddingTop: "122px" }}>
      <body
        className={clsx("bg-neutral-800 text-text-primary", robotMono.variable)}
      >
        {children}
        <NextTopLoader color="#c22424" showSpinner={false} />
        <ToasterContainer />
        <AnalyticsLoader />
        <SpeedInsights sampleRate={0.5} />
      </body>
    </html>
  );
}
