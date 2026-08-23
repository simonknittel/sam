"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const QueryClientProviderContainer = ({ children }: Readonly<Props>) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * The library default refetches every mounted query when the tab
             * regains focus. All queries hit uncached serverless functions, so
             * this produces redundant traffic; mutations invalidate explicitly
             * where freshness matters.
             */
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default QueryClientProviderContainer;
