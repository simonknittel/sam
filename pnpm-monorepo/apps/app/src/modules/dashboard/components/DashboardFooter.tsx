import { env } from "@/env";

export const DashboardFooter = () => {
  if (!env.NEXT_PUBLIC_RELEASE_NUMBER) return null;

  return (
    <footer className="text-center text-xs text-neutral-500">
      Release {env.NEXT_PUBLIC_RELEASE_NUMBER}
    </footer>
  );
};
