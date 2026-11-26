import type { ReactNode } from "react";

interface ListProps {
  /** `SharingPopoverTopic` elements */
  readonly children: ReactNode;
}

/** A list of topics that explain a part of the Remote Control Program */
export const SharingPopoverTopicList = ({ children }: ListProps) => {
  return <dl className="flex flex-col gap-3 text-sm">{children}</dl>;
};

interface Props {
  readonly title: string;
  readonly children: ReactNode;
}

export const SharingPopoverTopic = ({ title, children }: Props) => {
  return (
    <div>
      <dt className="font-bold">{title}</dt>
      <dd className="flex flex-col gap-1 text-neutral-400">{children}</dd>
    </div>
  );
};
