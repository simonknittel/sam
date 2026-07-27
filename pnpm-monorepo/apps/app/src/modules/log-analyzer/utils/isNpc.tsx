const PREFIXES = [
  "Hazard-00",
  "StreamingSOC_",
  "RotationSimple-",
  "Kopion_",
  "Hazard_Pit",
  "yormandi_",
];

export const isNpc = (handle: string) =>
  (handle.length >= 27 && handle.split("_").length - 1 >= 2) ||
  PREFIXES.some((NPC_HANDLE) => handle.startsWith(NPC_HANDLE));
