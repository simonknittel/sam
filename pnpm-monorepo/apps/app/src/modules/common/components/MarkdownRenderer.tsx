import clsx from "clsx";
import type { Ref } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly children: string;
  readonly ref?: Ref<HTMLDivElement>;
  readonly remarkPlugins: Options["remarkPlugins"];
}

/**
 * The shared body of the Markdown components. The set of remark plugins
 * decides which formats the output shows.
 */
export const MarkdownRenderer = ({
  className,
  children,
  ref,
  remarkPlugins,
}: Props) => {
  return (
    <div
      ref={ref}
      className={clsx("prose prose-invert max-w-none", className)}
      style={{
        overflowWrap: "anywhere",
      }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ href, node, children, ...props }) => {
            /**
             * `react-markdown` empties the address of a scheme that it does
             * not trust. The label stays as text, so that no content is lost.
             */
            if (!href) return <>{children}</>;

            const isExternal = /^https?:\/\//.test(href);

            if (isExternal)
              return (
                <a href={href} target="_blank" rel="noreferrer" {...props}>
                  {children}
                </a>
              );

            return (
              <Link href={href} {...props}>
                {children}
              </Link>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
