"use client";

import { createContext, useContext } from "react";
import { TruncatedText } from "./TruncatedText";

/**
 * The names of the accepted contracts by their mission id. This file imports
 * nothing from `PATTERNS`, because `PATTERNS` renders the component below.
 */
export const ContractNamesContext = createContext<ReadonlyMap<string, string>>(
  new Map(),
);

interface Props {
  readonly missionId: string;
}

/**
 * The line of an abandoned contract holds only the mission id. The name comes
 * from the loaded entries, thus it does not depend on the order in which the
 * local parser and the shared entries deliver the two lines.
 */
export const AbandonedContractName = ({ missionId }: Props) => {
  const contractNames = useContext(ContractNamesContext);

  return (
    <TruncatedText>
      {contractNames.get(missionId) ?? "Unbekannter Contract"}
    </TruncatedText>
  );
};
