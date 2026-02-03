import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { Link } from "@/modules/common/components/Link";
import { Note } from "@/modules/common/components/Note";
import { createTask } from "@/modules/tasks/actions/createTask";
import { TaskRewardType, TaskVisibility } from "@prisma/client";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { FaChevronRight, FaSave, FaSpinner } from "react-icons/fa";
import { RequiredRoles } from "./RequiredRoles";

enum Step {
  Description = "Description",
  Visibility = "Visibility",
  Reward = "Reward",
  Other = "Other",
}

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateTaskForm = ({ className, onSuccess }: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Forbidden");
  const showPersonalizedAndGroup = authentication.authorize("task", "create", [
    {
      key: "taskVisibility",
      value: `${TaskVisibility.PERSONALIZED}`,
    },
  ]);
  const showNewSilc = authentication.authorize("task", "create", [
    {
      key: "taskRewardType",
      value: TaskRewardType.NEW_SILC,
    },
  ]);

  const [step, setStep] = useState<Step>(Step.Description);
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await createTask(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success!);
        onSuccess?.();
        return response;
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
        return {
          error:
            "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
          requestPayload: formData,
        };
      }
    },
    null,
  );
  const [visibility, setVisibility] = useState<string>(TaskVisibility.PUBLIC);
  const [rewardType, setRewardType] = useState<string>(TaskRewardType.TEXT);

  return (
    <form action={formAction} className={clsx(className)}>
      <div className="flex flex-wrap justify-center -mt-2 mb-6">
        <button
          type="button"
          onClick={() => setStep(Step.Description)}
          className={clsx(
            "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-12 flex items-center justify-center px-3 gap-2 uppercase",
            {
              "bg-brand-red-500 text-white": step === Step.Description,
              "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
                step !== Step.Description,
            },
          )}
        >
          1. Beschreibung
        </button>

        <button
          type="button"
          onClick={() => setStep(Step.Visibility)}
          className={clsx(
            "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-12 flex items-center justify-center px-3 gap-2 uppercase",
            {
              "bg-brand-red-500 text-white": step === Step.Visibility,
              "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
                step !== Step.Visibility,
            },
          )}
        >
          2. Zielgruppe
        </button>

        <button
          type="button"
          onClick={() => setStep(Step.Reward)}
          className={clsx(
            "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-12 flex items-center justify-center px-3 gap-2 uppercase",
            {
              "bg-brand-red-500 text-white": step === Step.Reward,
              "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
                step !== Step.Reward,
            },
          )}
        >
          3. Belohnung
        </button>

        <button
          type="button"
          onClick={() => setStep(Step.Other)}
          className={clsx(
            "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-12 flex items-center justify-center px-3 gap-2 uppercase",
            {
              "bg-brand-red-500 text-white": step === Step.Other,
              "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
                step !== Step.Other,
            },
          )}
        >
          4. Sonstiges
        </button>
      </div>

      <div
        className={clsx({
          block: step === Step.Description,
          hidden: step !== Step.Description,
        })}
      >
        <TextInput
          name="title"
          label="Titel"
          maxLength={64}
          defaultValue={
            state?.requestPayload?.has("title")
              ? (state.requestPayload.get("title") as string)
              : ""
          }
          required
          autoFocus
        />

        <Textarea
          name="description"
          label="Beschreibung"
          hint={
            <>
              optional, max. 2048 Zeichen,{" "}
              <Link
                href="https://github.github.com/gfm/"
                target="_blank"
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
              >
                GitHub Flavored Markdown-Support
              </Link>
            </>
          }
          maxLength={2048}
          defaultValue={
            state?.requestPayload?.has("description")
              ? (state.requestPayload.get("description") as string)
              : ""
          }
          className="mt-4"
          classNameTextarea="h-64"
        />

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setStep(Step.Visibility)}
          className="mt-4 ml-auto"
        >
          <FaChevronRight />
          Weiter
        </Button2>
      </div>

      <div
        className={clsx({
          block: step === Step.Visibility,
          hidden: step !== Step.Visibility,
        })}
      >
        <p className="mt-4">Typ</p>
        <RadioGroup
          name="visibility"
          items={[
            {
              value: TaskVisibility.PUBLIC,
              label: "Öffentlich",
              hint: "Dieser Task kann von jedem angenommen und erfüllt werden.",
            },
            ...(showPersonalizedAndGroup
              ? [
                  {
                    value: TaskVisibility.PERSONALIZED,
                    label: "Personalisiert",
                    hint: "Dieser Task kann nur von dem adressierten Citizen gesehen werden und muss von diesem erfüllt werden. Werden mehrere Citizen angegeben, wird dieser Task für jeden dupliziert.",
                  },
                  {
                    value: TaskVisibility.GROUP,
                    label: "Gruppe",
                    hint: "Dieser Task kann nur von der adressierten Gruppe gesehen werden und muss von dieser erfüllt werden.",
                  },
                ]
              : []),
          ]}
          value={visibility}
          onChange={setVisibility}
          className="mt-2"
        />

        {visibility === TaskVisibility.PUBLIC && (
          <>
            <NumberInput
              name="assignmentLimit"
              label="Teilnehmerlimit"
              hint="optional"
              defaultValue={
                state?.requestPayload?.has("assignmentLimit")
                  ? (state.requestPayload.get("assignmentLimit") as string)
                  : undefined
              }
              min={1}
              labelClassName="mt-4"
            />

            <RequiredRoles className="mt-4" />

            <label className="mt-4 mb-2 block">
              Soll dieser Task für die anderen Rollen versteckt werden?
            </label>
            <YesNoCheckbox name="hiddenForOtherRoles" />
          </>
        )}

        {(visibility === TaskVisibility.PERSONALIZED ||
          visibility === TaskVisibility.GROUP) && (
          <>
            <CitizenInput name="assignedToId" multiple className="mt-4" />

            <label className="mt-4 mb-2 block">
              Kann dieser Task selbstständig abgeschlossen werden?
            </label>
            <YesNoCheckbox name="canSelfComplete" />
          </>
        )}

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setStep(Step.Reward)}
          className="mt-4 ml-auto"
        >
          <FaChevronRight />
          Weiter
        </Button2>
      </div>

      <div
        className={clsx({
          block: step === Step.Reward,
          hidden: step !== Step.Reward,
        })}
      >
        <p className="mt-4">Typ</p>
        <RadioGroup
          name="rewardType"
          items={[
            {
              value: TaskRewardType.TEXT,
              label: "Freitext",
              hint: (
                <>
                  Beispiel:{" "}
                  <span className="italic">
                    &ldquo;500.000 aUEC pro Helm&rdquo;
                  </span>
                </>
              ),
            },
            {
              value: TaskRewardType.SILC,
              label: "SILC",
              hint: "Diese SILC werden von deinem Konto abgezogen.",
            },
            ...(showNewSilc
              ? [
                  {
                    value: TaskRewardType.NEW_SILC,
                    label: "Neue SILC",
                    hint: "Diese SILC werden neu ausgegeben.",
                  },
                ]
              : []),
          ]}
          value={rewardType}
          onChange={setRewardType}
          className="mt-2"
        />

        {rewardType === TaskRewardType.SILC && (
          <NumberInput
            name="rewardTypeSilcValue"
            label="SILC (pro Citizen)"
            defaultValue={
              state?.requestPayload?.has("rewardTypeSilcValue")
                ? (state.requestPayload.get("rewardTypeSilcValue") as string)
                : 1
            }
            required
            labelClassName="mt-4"
          />
        )}

        {rewardType === TaskRewardType.NEW_SILC && (
          <NumberInput
            name="rewardTypeNewSilcValue"
            label="SILC (pro Citizen)"
            defaultValue={
              state?.requestPayload?.has("rewardTypeNewSilcValue")
                ? (state.requestPayload.get("rewardTypeNewSilcValue") as string)
                : 1
            }
            required
            labelClassName="mt-4"
          />
        )}

        {rewardType === TaskRewardType.TEXT && (
          <Textarea
            name="rewardTypeTextValue"
            label="Text"
            hint={
              <>
                optional, max. 2048 Zeichen,{" "}
                <Link
                  href="https://github.github.com/gfm/"
                  target="_blank"
                  className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
                >
                  GitHub Flavored Markdown-Support
                </Link>
              </>
            }
            maxLength={2048}
            defaultValue={
              state?.requestPayload?.has("rewardTypeTextValue")
                ? (state.requestPayload.get("rewardTypeTextValue") as string)
                : ""
            }
            className="mt-4"
            classNameTextarea="h-64"
          />
        )}

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setStep(Step.Other)}
          className="mt-4 ml-auto"
        >
          <FaChevronRight />
          Weiter
        </Button2>
      </div>

      <div
        className={clsx({
          block: step === Step.Other,
          hidden: step !== Step.Other,
        })}
      >
        <DateTimeInput
          name="expiresAt"
          label="Ablaufdatum"
          hint="optional"
          defaultValue={
            state?.requestPayload?.has("expiresAt")
              ? (state.requestPayload.get("expiresAt") as string)
              : ""
          }
          className="mt-4"
        />

        <NumberInput
          name="repeatable"
          label="Wie häufig kann dieser Task abgeschlossen werden?"
          defaultValue={
            state?.requestPayload?.has("repeatable")
              ? (state.requestPayload.get("repeatable") as string)
              : 1
          }
          required
          min={1}
          labelClassName="mt-4"
        />

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Speichern
        </Button2>
      </div>

      {state?.error && (
        <Note type="error" message={state.error} className="mt-4" />
      )}
    </form>
  );
};
