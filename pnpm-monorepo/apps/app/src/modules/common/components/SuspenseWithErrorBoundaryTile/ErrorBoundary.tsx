"use client";

import { wikiPageLinkHref } from "@/modules/wiki/utils/wikiPageLinks";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { catchError, type ErrorInfo } from "next/error";
import { useTransition } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { AsciiSpinner } from "../AsciiSpinner";
import { Button2, Button2Variant } from "../Button2";
import { Link } from "../Link";

interface Props {
  readonly className?: string;
}

/** Next.js gives the errors of Server Components a digest for the server logs */
const getDigest = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  typeof error.digest === "string"
    ? error.digest
    : null;

const Fallback = ({ className }: Props, { error, retry }: ErrorInfo) => {
  const t = useTranslations();
  /**
   * The retry refreshes the page in a transition. The pending state stays
   * until the new server render shows, thus a second click cannot start a
   * second refresh.
   */
  const [isRetrying, startRetry] = useTransition();

  return (
    <section
      className={clsx(
        "rounded-primary border border-red-500 bg-neutral-800/50",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <BsExclamationOctagonFill className="text-red-800" />
        <h2 className="text-xl font-thin text-red-500">Fehler</h2>
      </div>

      <div className="p-4 lg:p-4">
        <div>
          {t.rich("Common.internalServerError", {
            link: (chunks) => (
              <Link
                href={wikiPageLinkHref("support")}
                className="text-interaction-500 underline hover:text-interaction-300 focus-visible:text-interaction-300"
              >
                {chunks}
              </Link>
            ),
          })}
        </div>

        <p className="mt-2 text-sm text-neutral-500">
          Digest: {getDigest(error) ?? "unknown"}
        </p>

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => startRetry(retry)}
          disabled={isRetrying}
          className="mt-4"
        >
          {isRetrying && <AsciiSpinner />}
          Erneut versuchen
        </Button2>
      </div>
    </section>
  );
};

/**
 * Unlike a plain React error boundary, `catchError` lets `notFound()`,
 * `forbidden()` and `redirect()` through to the handling of Next.js, and it
 * resets when the user goes to a different page.
 *
 * A change of only the search parameters does not reset it, because
 * `catchError` compares only the pathname. The retry resets it.
 */
export const ErrorBoundary = catchError(Fallback);
