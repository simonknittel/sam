import { env } from "@/env";
import { AnalyticsLoader } from "@/modules/common/components/AnalyticsLoader";
import ToasterContainer from "@/modules/common/components/ToasterContainer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type Metadata } from "next";
import { getLocale } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import { type ReactNode } from "react";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.BASE_URL),
  title: {
    default: "S.A.M. - Sinister Incorporated",
    template: "%s | S.A.M. - Sinister Incorporated",
  },
};

interface Props {
  children: ReactNode;
}

export default async function RootLayout({ children }: Readonly<Props>) {
  const locale = await getLocale();

  return (
    <html lang={locale} style={{ scrollPaddingTop: "122px" }}>
      <body className="bg-neutral-800 text-text-primary">
        {children}
        <NextTopLoader color="#c22424" showSpinner={false} />
        <ToasterContainer />
        <AnalyticsLoader />
        <SpeedInsights sampleRate={0.5} />
      </body>
    </html>
  );
}
