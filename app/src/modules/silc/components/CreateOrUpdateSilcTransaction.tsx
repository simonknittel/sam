"use client";

import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import type { Entity, SilcTransaction } from "@prisma/client";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { FaPen, FaPlus, FaSave, FaSpinner } from "react-icons/fa";
import { createSilcTransaction } from "../actions/createSilcTransaction";
import { updateSilcTransaction } from "../actions/updateSilcTransaction";

interface BaseProps {
  className?: string;
}

interface CreateProps extends BaseProps {
  initialReceiverIds?: Entity["id"][];
  initialDescription?: string;
}

interface UpdateProps extends BaseProps {
  transaction: SilcTransaction;
}

type Props = CreateProps | UpdateProps;

export const CreateOrUpdateSilcTransaction = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response =
          "transaction" in props
            ? await updateSilcTransaction(formData)
            : await createSilcTransaction(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success!);
        if (formData.has("createAnother")) {
          return response;
        }

        setIsOpen(false);
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

  return (
    <>
      {"transaction" in props ? (
        <Button
          onClick={() => setIsOpen(true)}
          variant="tertiary"
          className={clsx("px-2 w-auto", props.className)}
          title="Transaktion bearbeiten"
          iconOnly
        >
          <FaPen />
        </Button>
      ) : (
        <Button2
          onClick={() => setIsOpen(true)}
          variant={Button2Variant.Secondary}
          className={clsx(props.className)}
          title="Transaktion erstellen"
        >
          <span className="hidden md:inline">Transaktion erstellen</span>
          <FaPlus />
        </Button2>
      )}

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={
          <h2>
            {"transaction" in props
              ? "Transaktion bearbeiten"
              : "Transaktion erstellen"}
          </h2>
        }
      >
        <form action={formAction}>
          {"transaction" in props && props.transaction && (
            <input
              type="hidden"
              name="transactionId"
              value={props.transaction.id}
            />
          )}

          {"transaction" in props && props.transaction ? (
            <CitizenInput
              name="receiverId"
              defaultValue={props.transaction.receiverId}
              disabled
              autoFocus
            />
          ) : (
            <CitizenInput
              name="receiverId"
              multiple
              autoFocus
              defaultValue={
                "initialReceiverIds" in props ? props.initialReceiverIds : []
              }
            />
          )}

          <NumberInput
            name="value"
            label="Wert"
            hint="Kann negativ sein, um Guthaben zu entziehen."
            required
            defaultValue={
              state?.requestPayload?.has("value")
                ? (state.requestPayload.get("value") as string)
                : ("transaction" in props && props.transaction?.value) || 1
            }
            labelClassName="mt-4"
          />

          <Textarea
            name="description"
            label="Beschreibung"
            hint="optional"
            maxLength={512}
            defaultValue={
              state?.requestPayload?.has("description")
                ? (state.requestPayload.get("description") as string)
                : "transaction" in props && props.transaction?.description
                  ? props.transaction?.description
                  : "initialDescription" in props
                    ? props.initialDescription
                    : ""
            }
            className="mt-4"
          />

          <div className="flex flex-col gap-2 mt-4">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Speichern
            </Button2>

            {!("transaction" in props) && (
              <Button
                type="submit"
                disabled={isPending}
                variant="tertiary"
                name="createAnother"
              >
                {isPending ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSave />
                )}
                Speichern und weitere Transaktion erstellen
              </Button>
            )}
          </div>

          {state?.error && (
            <Note type="error" message={state.error} className="mt-4" />
          )}
        </form>
      </Modal>
    </>
  );
};
