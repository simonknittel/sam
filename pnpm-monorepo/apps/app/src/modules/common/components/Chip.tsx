import { type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly title?: string;
}

export const Chip = ({ children, title }: Props) => {
  return (
    <span
      className="rounded-secondary bg-neutral-700 py-1 px-2 text-sm text-neutral-50"
      title={
        title
          ? title
          : typeof children === "string"
            ? children?.toString()
            : undefined
      }
    >
      {children}
    </span>
  );
};
