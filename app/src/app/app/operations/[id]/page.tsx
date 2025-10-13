import { requireAuthenticationPage } from "@/modules/auth/server";
import Avatar from "@/modules/common/components/Avatar";
import { Link } from "@/modules/common/components/Link";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import ConfirmParticipation from "@/modules/operations/components/ConfirmParticipation";
import CreateUnit from "@/modules/operations/components/CreateUnit";
import DeleteOperation from "@/modules/operations/components/DeleteOperation";
import EditOperation from "@/modules/operations/components/EditOperation";
import JoinOperation from "@/modules/operations/components/JoinOperation";
import RemoveParticipation from "@/modules/operations/components/RemoveParticipation";
import SquadronTile from "@/modules/operations/components/SquadronTile";
import { getOperation } from "@/modules/operations/queries";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const operation = await getOperation((await props.params).id);
    if (!operation) return {};

    return {
      title: `${operation.title} - Operation`,
    };
  },
);

interface Props {
  params: Params;
}

export default async function Page(props: Readonly<Props>) {
  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableOperations))) notFound();

  const authentication = await requireAuthenticationPage(
    "/app/operations/[id]",
  );
  await authentication.authorizePage("operation", "manage");

  const operation = await getOperation((await props.params).id);
  if (!operation) notFound();

  const confirmedMembers = operation.members.filter(
    (member) => member.status === "confirmed",
  );
  const unconfirmedMembers = operation.members.filter(
    (member) => member.status === "pending",
  );

  return (
    <main className="p-4 pb-20 lg:p-6">
      <div className="flex gap-2 font-bold text-xl">
        <Link
          href="/app/operations"
          className="text-neutral-500 flex gap-1 items-center hover:text-neutral-300"
        >
          Operationen
        </Link>

        <span className="text-neutral-500">/</span>

        <div className="flex gap-2">
          <h1>{operation.title}</h1>

          <div className="flex">
            <EditOperation operation={operation} />
            <DeleteOperation operation={operation} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_24rem] gap-8">
        <div>
          {operation.units
            .filter((unit) => unit.type === "squadron")
            .toSorted((a, b) => a.title.localeCompare(b.title))
            .map((unit) => (
              <SquadronTile key={unit.id} unit={unit} className="mt-4" />
            ))}

          <div className="mt-4">
            <CreateUnit operation={operation} />
          </div>
        </div>

        <div className="border-l-2 border-neutral-700 px-4 lg:px-8">
          <div className="flex gap-4">
            <h2 className="text-lg font-bold">Teilnehmer</h2>
            <JoinOperation operation={operation} />
          </div>

          {operation.members.length > 0 ? (
            <>
              {confirmedMembers.length > 0 && (
                <>
                  <h3 className="font-bold mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 block bg-green-500 rounded-full" />
                    Anwesend
                  </h3>

                  <ul className="mt-2 flex flex-col gap-1">
                    {confirmedMembers
                      .toSorted((a, b) =>
                        a.user.name!.localeCompare(b.user.name!),
                      )
                      .map((member) => (
                        <li
                          className="flex gap-2 items-center"
                          key={member.userId}
                        >
                          <Avatar
                            name={member.user.name}
                            image={member.user.image}
                            size={32}
                            className="grow-1 shrink-0"
                          />

                          {member.user.name}

                          <RemoveParticipation operation={operation} />
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {unconfirmedMembers.length > 0 && (
                <>
                  <h3 className="font-bold mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 block bg-red-500 rounded-full" />
                    Unbestätigt
                  </h3>

                  <ul className="mt-2 flex flex-col gap-1">
                    {unconfirmedMembers
                      .toSorted((a, b) =>
                        a.user.name!.localeCompare(b.user.name!),
                      )
                      .map((member) => (
                        <li
                          className="flex gap-2 items-center"
                          key={member.userId}
                        >
                          <Avatar
                            name={member.user.name}
                            image={member.user.image}
                            size={32}
                            className="grow-1 shrink-0"
                          />

                          {member.user.name}

                          <ConfirmParticipation operation={operation} />
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="text-neutral-500 italic mt-4">Keine Teilnehmer</p>
          )}
        </div>
      </div>
    </main>
  );
}
