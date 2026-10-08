import { env } from "@/env";

/** The same length as the short SHAs on GitHub */
const SHORT_COMMIT_SHA_LENGTH = 7;

export const DashboardFooter = () => {
  if (!env.NEXT_PUBLIC_RELEASE_NUMBER) return null;

  return (
    <footer className="text-center text-xs text-neutral-500">
      Release {env.NEXT_PUBLIC_RELEASE_NUMBER}
      {env.COMMIT_SHA &&
        ` (${env.COMMIT_SHA.slice(0, SHORT_COMMIT_SHA_LENGTH)})`}
    </footer>
  );
};
