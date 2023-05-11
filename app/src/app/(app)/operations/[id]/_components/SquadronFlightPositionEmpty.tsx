"use client";

import {
  type Operation,
  type OperationMember,
  type OperationUnit,
  type Ship,
  type User,
  type Variant,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";
import Button from "~/app/_components/Button";
import Modal from "~/app/_components/Modal";

interface Props {
  type:
    | "squadron-flight-1-leader"
    | "squadron-flight-1-wingman"
    | "squadron-flight-2"
    | "squadron-flight-2-wingman";
  unit: OperationUnit;
}

const positions = {
  "squadron-flight-1-leader": "1 Flight Lead",
  "squadron-flight-1-wingman": "1 Wingman",
  "squadron-flight-2": "2",
  "squadron-flight-2-wingman": "2 Wingman",
};

interface FormValues {
  userId: string;
  shipId: string;
}

const SquadronFlightPositionEmpty = ({ type, unit }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const selectUserId = useId();
  const selectShipId = useId();
  const { data: allOperationMembers } = useQuery<
    (OperationMember & {
      user: User & {
        ships: (Ship & {
          variant: Variant;
          operations: Operation[];
        })[];
      };
    })[]
  >({
    queryKey: ["operation-members", unit.operationId],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/operation-member/${queryKey[1]}`);
      return response.json();
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/operation-member/${unit.operationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "confirmed",
            title: positions[type],
            userId: data.userId,
            shipId: data.shipId,
            operationUnitId: unit.id,
          }),
        }
      );

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich besetzt");
        reset();
        setIsOpen(false);
      } else {
        toast.error("Beim Besetzen ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Besetzen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  const users = allOperationMembers
    ?.filter((member) => member.status === "confirmed")
    .sort((a, b) => a.user.name!.localeCompare(b.user.name!));

  const ships = allOperationMembers
    ?.filter((member) => member.status === "confirmed")
    .map((member) => member.user.ships)
    .flat()
    .sort((a, b) =>
      (a.name || b.variant.name).localeCompare(b.name || b.variant.name)
    );

  return (
    <li className="aspect-square text-center">
      <button
        type="button"
        className="block w-full"
        onClick={() => setIsOpen(true)}
        title="Position besetzen"
      >
        <p>
          {unit.title}-{positions[type]}
        </p>

        <p className="text-neutral-500 text-sm">Unbesetzt</p>

        <div className="bg-neutral-800 aspect-square rounded mt-2" />
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
      >
        <h2 className="text-xl font-bold">Position besetzen</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="mt-6 block" htmlFor={selectUserId}>
            Spieler
          </label>

          <select
            className="p-2 rounded bg-neutral-900 w-full mt-2"
            id={selectUserId}
            {...register("userId", { required: true })}
          >
            {users?.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name}
              </option>
            ))}

            {users && users.length <= 0 && (
              <option value="" disabled>
                Keine Spieler verfügbar
              </option>
            )}
          </select>

          <label className="mt-4 block" htmlFor={selectShipId}>
            Schiff
          </label>

          <select
            className="p-2 rounded bg-neutral-900 w-full mt-2"
            id={selectShipId}
            {...register("shipId", { required: true })}
          >
            {ships?.map((ship) => (
              <option key={ship.id} value={ship.id}>
                {ship.name
                  ? `${ship.name} (${ship.variant.name})`
                  : ship.variant.name}
              </option>
            ))}

            {ships && ships.length <= 0 && (
              <option value="" disabled>
                Keine Schiffe verfügbar
              </option>
            )}
          </select>

          <div className="flex justify-end mt-8">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Besetzen
            </Button>
          </div>
        </form>
      </Modal>
    </li>
  );
};

export default SquadronFlightPositionEmpty;
