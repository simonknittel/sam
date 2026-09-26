import { env } from "@/env";
import { NextIntlClientProvider } from "next-intl";
import { getDevelopmentLoginUsers } from "../queries/getDevelopmentLoginUsers";
import { DevelopmentLoginPopover } from "./DevelopmentLoginPopover";

interface Props {
  readonly redirectTo: string | null;
}

export const DevelopmentLogin = async ({ redirectTo }: Props) => {
  if (env.NODE_ENV !== "development") return null;

  const users = await getDevelopmentLoginUsers();

  // The login page has no provider of its own, and `useAction` needs one
  return (
    <NextIntlClientProvider>
      <DevelopmentLoginPopover users={users} redirectTo={redirectTo} />
    </NextIntlClientProvider>
  );
};
