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
          a: ({ href, node, ...props }) => {
            if (!href) return null;

            const isExternal = /^https?:\/\//.test(href);

            if (isExternal)
              return (
                <a href={href} target="_blank" rel="noreferrer" {...props} />
              );

            return <Link href={href} {...props} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
