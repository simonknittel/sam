import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { CreateOperation } from "@/modules/operations/components/CreateOperation";
import OperationTile from "@/modules/operations/components/OperationTile";
import { getOperations } from "@/modules/operations/queries";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Operationen",
};

export default async function Page() {
  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableOperations))) notFound();

  const authentication = await requireAuthenticationPage("/app/operations");
  await authentication.authorizePage("operation", "manage");

  const operations = await getOperations();

  return (
    <main className="p-4 pb-20 lg:p-6">
      <h1 className="text-xl font-bold">Operationen</h1>

      <Note
        message={
          <p>
            Operationen sind aktuell in der Proof of Concept-Phase. Funktionen
            fehlen und es kann zu Fehlern kommen.
          </p>
        }
        className="mt-4"
      />

      {operations
        .toSorted((a, b) => a.title.localeCompare(b.title))
        .map((operation) => (
          <OperationTile
            key={operation.id}
            operation={operation}
            className="mt-4 max-w-4xl"
          />
        ))}

      {operations.length === 0 && (
        <div className="bg-neutral-800/50 rounded-primary p-4 lg:p-8 max-w-4xl mt-4">
          <p>Aktuell sind keine Operationen geplant.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center max-w-4xl gap-4">
        <CreateOperation />
      </div>
    </main>
  );
}
