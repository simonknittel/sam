import { requireAuthenticationPage } from "@/modules/auth/server";
import { MainContent } from "@/modules/common/components/layouts/MainContent";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { AuthorizationRequest } from "@/modules/oauth/components/AuthorizationRequest";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zugriff erlauben",
};

/** The authorization endpoint of the OAuth server (RFC 6749 section 3.1) */
export default async function Page({
  searchParams,
}: PageProps<"/app/oauth/authorize">) {
  const { session } = await requireAuthenticationPage("/app/oauth/authorize");

  return (
    <MainContent>
      <MaxWidthContent maxWidth="prose">
        <AuthorizationRequest
          parameters={await searchParams}
          isAssumedUser={!!session.assumedByAdminId}
        />
      </MaxWidthContent>
    </MainContent>
  );
}
