import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const awaitedCookies = await cookies();

  const locale = awaitedCookies.get("locale")?.value ?? "de";

  return {
    locale,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Berlin",
  };
});
