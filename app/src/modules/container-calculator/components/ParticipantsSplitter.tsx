// @ts-nocheck

import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { useRef, useState, type ChangeEventHandler } from "react";
import type { ContainerResult } from "./ContainerCalculator";

interface ParticipantsResult {}

interface Props {
  readonly className?: string;
  readonly containerResult: ContainerResult | null;
}

export const ParticipantsSplitter = ({ className, containerResult }: Props) => {
  const participantsFormRef = useRef<HTMLFormElement>(null);
  const [participantsResult, setParticipantsResult] =
    useState<ParticipantsResult | null>(null);
  const [method, setMethod] = useState("bigToSmall");

  const handleChangeParticipants: ChangeEventHandler<HTMLFormElement> = () => {
    if (!participantsFormRef.current) return;
    if (!containerResult) return;

    const participantsCount =
      parseInt(
        new FormData(participantsFormRef.current).get(
          "participantsCount",
        ) as string,
        10,
      ) || 2;

    if (method === "bigToSmall") {
      // TODO
      setParticipantsResult();
      return;
    }

    if (method === "evenly") {
      // TODO
      setParticipantsResult();
      return;
    }
  };

  return (
    <Tile heading="Auf Teilnehmer verteilen" className={clsx(className)}>
      <form ref={participantsFormRef} onChange={handleChangeParticipants}>
        <NumberInput
          name="participantsCount"
          label="Teilnehmeranzahl"
          placeholder="2"
          min={2}
          required
        />

        <p className="mt-4">Methode</p>
        <RadioGroup
          name="method"
          items={[
            {
              value: "bigToSmall",
              label: "Von Groß nach Klein",
              hint: "Die ersten Teilnehmer bekommen die größten Container, die letzten die kleinsten.",
            },
            {
              value: "evenly",
              label: "Gleichmäßig",
              hint: "Jeder Teilnehmer bekommt wenn möglich die gleiche Anzahl und Größe an Containern.",
            },
          ]}
          value={method}
          onChange={setMethod}
          className="mt-2"
        />
      </form>
    </Tile>
  );
};
