/** Marks a state whose end line can be lost, see `liveStatus.ts` */
export const LiveStatusUncertainLabel = () => (
  <span
    className="shrink-0 text-xs text-amber-300"
    title="Seit längerer Zeit kam keine passende Log-Zeile. Der Zustand ist vielleicht schon beendet."
  >
    unsicher
  </span>
);
