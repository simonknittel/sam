"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Modal from "@/modules/common/components/Modal";
import type { Entity, SilcTransaction } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaPlus, FaSave } from "react-icons/fa";
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
  transaction: Pick<
    SilcTransaction,
    "id" | "receiverId" | "value" | "description"
  >;
}

type Props = CreateProps | UpdateProps;

export const CreateOrUpdateSilcTransaction = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(
      "transaction" in props ? updateSilcTransaction : createSilcTransaction,
      {
        errorToast: false,
        onSuccess: (formData) => {
          if (formData.has("createAnother")) return;
          setIsOpen(false);
        },
      },
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
        className="w-120"
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
            defaultValue={getDefaultValueWithFallback(
              "value",
              ("transaction" in props && props.transaction?.value) || 1,
            )}
            labelClassName="mt-4"
          />

          <Textarea
            name="description"
            label="Beschreibung"
            hint="optional"
            maxLength={512}
            defaultValue={getDefaultValueWithFallback(
              "description",
              "transaction" in props && props.transaction?.description
                ? props.transaction.description
                : "initialDescription" in props
                  ? props.initialDescription
                  : "",
            )}
            className="mt-4"
          />

          <div className="flex flex-col gap-2 mt-4">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>

            {!("transaction" in props) && (
              <Button
                type="submit"
                disabled={isPending}
                variant="tertiary"
                name="createAnother"
              >
                {isPending ? <AsciiSpinner /> : <FaSave />}
                Speichern und weitere Transaktion erstellen
              </Button>
            )}
          </div>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
