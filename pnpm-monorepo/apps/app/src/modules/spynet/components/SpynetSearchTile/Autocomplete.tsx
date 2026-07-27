"use client";

import { autocomplete } from "@algolia/autocomplete-js";
// @ts-expect-error - No types available for this package. It will get removed later on, anyway.
import "@algolia/autocomplete-theme-classic";
import { createElement, Fragment, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

type Props = Parameters<typeof autocomplete>[0];

export const Autocomplete = (props: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRootRef = useRef<Root | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { container, renderer, render, ...rest } = props;

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const search = autocomplete({
      container: containerRef.current,
      renderer: { createElement, Fragment, render: () => {} },
      render({ children }, root) {
        if (!panelRootRef.current || rootRef.current !== root) {
          rootRef.current = root;

          panelRootRef.current?.unmount();
          panelRootRef.current = createRoot(root);
        }

        panelRootRef.current.render(children);
      },
      ...rest,
    });

    return () => {
      search.destroy();
    };
  }, [rest]);

  return <div ref={containerRef} className="w-full" />;
};
