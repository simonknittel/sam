import { FaHammer } from "react-icons/fa";

export const Wip = () => {
  return (
    <div className="flex items-center justify-center text-neutral-500 flex-col flex-1">
      <FaHammer />
      <span className="text-sm">work in progress</span>
    </div>
  );
};
