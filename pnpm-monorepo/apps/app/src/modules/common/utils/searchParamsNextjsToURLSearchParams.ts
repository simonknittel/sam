export type NextjsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const searchParamsNextjsToURLSearchParams = async (
  nextjsSearchParams: NextjsSearchParams,
): Promise<URLSearchParams> => {
  const awaitedNextjsSearchParams = await nextjsSearchParams;
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(awaitedNextjsSearchParams)) {
    const v = typeof value === "string" ? value : value?.[0];
    if (!v) continue;
    urlSearchParams.set(key, v);
  }

  return urlSearchParams;
};
