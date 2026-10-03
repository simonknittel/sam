import { requireAuthenticationPage } from "@/modules/auth/server";
import { CreateCitizenButton } from "@/modules/citizen/components/CreateCitizenButton";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { CreateOrganizationButton } from "@/modules/spynet/components/CreateOrganization/CreateOrganizationButton";
import { SpynetSearchTile } from "@/modules/spynet/components/SpynetSearchTile/SpynetSearchTile";

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/spynet");

  const [citizenRead, organizationRead, citizenCreate, organisationCreate] =
    await Promise.all([
      authentication.authorize("citizen", "read"),
      authentication.authorize("organization", "read"),
      authentication.authorize("citizen", "create"),
      authentication.authorize("organization", "create"),
    ]);

  return (
    <MaxWidthContent>
      <div className="mx-auto max-w-100">
        {(citizenRead || organizationRead) && <SpynetSearchTile />}

        {(citizenCreate || organisationCreate) && (
          <div className="mt-4 flex justify-center gap-2">
            {citizenCreate && <CreateCitizenButton />}
            {organisationCreate && <CreateOrganizationButton />}
          </div>
        )}
      </div>
    </MaxWidthContent>
  );
}
