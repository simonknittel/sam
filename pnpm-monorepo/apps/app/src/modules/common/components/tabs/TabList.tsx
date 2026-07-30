import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const TabList = ({ children }: Readonly<Props>) => {
  return <div className="flex mb-4 flex-wrap">{children}</div>;
};

export default TabList;
