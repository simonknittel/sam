import { FaHammer } from "react-icons/fa";

export const Wip = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-neutral-500">
      <FaHammer />
      <span className="text-sm">work in progress</span>
    </div>
  );
};
