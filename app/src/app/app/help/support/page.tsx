import { prisma } from "@/db";
import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { RichText } from "@/modules/common/components/RichText";
import { SectionHeading } from "@/modules/help/components/SectionHeading";
import { TableOfContents } from "@/modules/help/components/TableOfContents";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
};

export default async function Page() {
  await requireAuthenticationPage("/app/help/support");

  const ind3x = await prisma.entity.findFirst({
    where: {
      handle: "ind3x",
    },
  });

  return (
    <MaxWidthContent className="mt-4 flex flex-col lg:flex-row-reverse lg:items-start gap-4">
      <TableOfContents
        items={[
          {
            title: "Support",
            href: "#support",
          },
        ]}
      />

      <div className="flex-1 flex flex-col gap-2">
        <section className="background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/support#support`}
            level={1}
            className="mb-4"
          >
            Support
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Du hast Fragen oder Probleme mit dem SAM? Melde dich am besten
              bei <CitizenLink citizen={ind3x} />. Ich bin am schnellsten über
              Discord erreichbar.
            </p>
          </RichText>
        </section>
      </div>
    </MaxWidthContent>
  );
}
