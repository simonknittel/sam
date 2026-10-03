import clsx from "clsx";
import ReactMarkdown, { type Options } from "react-markdown";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly children: string;
  readonly remarkPlugins: Options["remarkPlugins"];
}

/**
 * The shared body of the Markdown components. The set of remark plugins
 * decides which formats the output shows.
 */
export const MarkdownRenderer = ({
  className,
  children,
  remarkPlugins,
}: Props) => {
  return (
    <div
      className={clsx("prose max-w-none wrap-anywhere prose-invert", className)}
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
