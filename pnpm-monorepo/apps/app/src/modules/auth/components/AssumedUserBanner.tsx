"use client";

interface Props {
  readonly assumedUserLabel: string;
}

export const AssumedUserBanner = ({ assumedUserLabel }: Props) => {
  const handleExit = () => {
    document.cookie = `assume_user=; path=/; samesite=lax; max-age=0;`;
    // Full reload instead of router.refresh(): a page rendered through the
    // forbidden() boundary is not re-rendered by a refresh and would keep
    // the assumed user's redaction state
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-4 backdrop-blur-sm px-2 py-1 rounded-secondary bg-red-500/50 text-xs font-mono uppercase">
      <p className="min-w-0 truncate" title={assumedUserLabel}>
        Assuming {assumedUserLabel}
      </p>

      <button
        type="button"
        className="whitespace-nowrap hover:underline focus-visible:underline active:underline cursor-pointer"
        onClick={handleExit}
      >
        Exit
      </button>
    </div>
  );
};
