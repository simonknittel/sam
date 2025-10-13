import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenNavigation } from "@/modules/citizen/components/CitizenNavigation";
import { getCitizenById } from "@/modules/citizen/queries";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { notFound } from "next/navigation";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/spynet/citizen/[id]">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]/layout",
  );
  await authentication.authorizePage("citizen", "read");

  const citizen = await getCitizenById((await params).id);
  if (!citizen) notFound();

  return (
    <MaxWidthContent>
      <div className="flex gap-2 font-bold text-xl">
        <Link
          href="/app/spynet"
          className="text-neutral-500 flex gap-1 items-center hover:text-neutral-300"
        >
          &lt; Spynet
        </Link>

        <span className="text-neutral-500">/</span>

        <span className="text-neutral-500 flex gap-1 items-center">
          Citizen
        </span>

        <span className="text-neutral-500">/</span>

        <h1 className="overflow-hidden text-ellipsis whitespace-nowrap">
          {citizen.handle || citizen.id}
        </h1>
      </div>

      <CitizenNavigation citizenId={citizen.id} className="mt-2 mb-4" />
      {children}
    </MaxWidthContent>
  );
}
