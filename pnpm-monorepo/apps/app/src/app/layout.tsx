import { env } from "@/env";
import ToasterContainer from "@/modules/common/components/ToasterContainer";
import { TooltipProvider } from "@/modules/common/components/Tooltip";
import {
  getPublicUploadBaseUrl,
  PUBLIC_UPLOAD_BASE_URL_ATTRIBUTE,
} from "@/modules/common/utils/getPublicUploadUrl";
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
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: "SAM - Sinister Incorporated",
    template: "%s | SAM - Sinister Incorporated",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} style={{ scrollPaddingTop: "122px" }}>
      <body
        className={clsx("bg-neutral-800 text-text-primary", robotMono.variable)}
        {...{ [PUBLIC_UPLOAD_BASE_URL_ATTRIBUTE]: getPublicUploadBaseUrl() }}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <NextTopLoader color="#c22424" showSpinner={false} />
        <ToasterContainer />
      </body>
    </html>
  );
}
