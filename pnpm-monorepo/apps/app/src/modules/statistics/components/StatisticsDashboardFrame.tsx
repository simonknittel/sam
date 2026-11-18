"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { IframeLayout } from "@/modules/common/components/layouts/IframeLayout";
import { Note } from "@/modules/common/components/Note";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * The note covers the frame 1 minute before the token expires. The deadline
 * in the browser starts at the first render in the browser, thus it is late
 * by the time from the render on the server to that render. Grafana accepts
 * a token until 1 minute after its `exp` claim. Thus a delay of up to
 * 2 minutes does not let a request of the frame fail.
 */
const EXPIRY_MARGIN_IN_MILLISECONDS = 60 * 1000;

/**
 * The deadline of each frame URL on the clock of the browser, from the first
 * render of the URL. The deadline starts from the lifetime that was left at
 * the render on the server, not from the `exp` claim, because the clock of
 * the browser can be different from the clock of the server. After a back or
 * forward navigation, Next.js shows the cached page again with the same
 * props: this record keeps the deadline of that page from a new start.
 */
const deadlines = new Map<string, number>();

const getDeadline = (src: string, remainingLifetimeInMilliseconds: number) => {
  const knownDeadline = deadlines.get(src);
  if (knownDeadline !== undefined) return knownDeadline;

  const deadline =
    Date.now() +
    remainingLifetimeInMilliseconds -
    EXPIRY_MARGIN_IN_MILLISECONDS;
  deadlines.set(src, deadline);

  return deadline;
};

interface Props {
  readonly src: string;
  /** The lifetime of the token in `src` that was left at the render */
  readonly remainingLifetimeInMilliseconds: number;
}

export const StatisticsDashboardFrame = ({
  src,
  remainingLifetimeInMilliseconds,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /**
   * A new render on the server gives a new `src`, thus the note goes away
   * without a reset of this state
   */
  const [expiredSrc, setExpiredSrc] = useState<string | null>(null);
  const isExpired = expiredSrc === src;

  useEffect(() => {
    const deadline = getDeadline(src, remainingLifetimeInMilliseconds);
    let timeout: number | undefined;

    const check = () => {
      window.clearTimeout(timeout);

      const remainingMilliseconds = deadline - Date.now();
      if (remainingMilliseconds <= 0) {
        setExpiredSrc(src);
        return;
      }

      // A timer can also fire early, for example after a change of the clock
      timeout = window.setTimeout(check, remainingMilliseconds);
    };

    timeout = window.setTimeout(check, deadline - Date.now());
    // The timer of a sleeping or hidden tab can fire late
    document.addEventListener("visibilitychange", check);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", check);
    };
  }, [src, remainingLifetimeInMilliseconds]);

  const reload = () => {
    // A new render on the server signs a new token
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="relative isolate">
      <IframeLayout
        src={src}
        iframeProps={{ title: "Statistiken", inert: isExpired }}
      />

      {isExpired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-900/70 p-4">
          {/* The tint of the note is transparent: this gives it a solid background */}
          <div className="max-w-prose rounded-primary bg-neutral-800">
            <Note
              type="warning"
              message={
                <div className="flex flex-col items-start gap-4">
                  <p role="alert">
                    Die Anmeldung für die Statistiken läuft ab. Lade die
                    Statistiken neu, um sie weiter zu nutzen. Der Zeitraum und
                    die Filter gehen dabei auf ihre Standardwerte zurück.
                  </p>

                  <Button2 type="button" onClick={reload} disabled={isPending}>
                    {isPending ? "Lädt …" : "Statistiken neu laden"}
                  </Button2>
                </div>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
