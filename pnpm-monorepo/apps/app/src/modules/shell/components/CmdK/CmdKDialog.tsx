import clsx from "clsx";
import { Command } from "cmdk";
import { type MouseEventHandler } from "react";
import { FaArrowLeft } from "react-icons/fa";
import "./CmdK.css";
import { useCmdKContext } from "./CmdKContext";
import { List } from "./List";

export const CmdKDialog = () => {
  const { open, setOpen, search, setSearch, pages, setPages } =
    useCmdKContext();

  const handleBack: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setPages((pages) => pages.slice(0, -1));
  };

  const page = pages.at(-1);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      overlayClassName="cmdk"
      contentClassName="cmdk"
      onKeyDown={(e) => {
        if (pages.length === 0) return;

        if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
          e.preventDefault();
          setPages((pages) => pages.slice(0, -1));
        }
      }}
      shouldFilter={page !== "spynet-search"}
      label="Navigation"
    >
      <div className="relative">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Suche ..."
          className={clsx("p-4", {
            "pl-10": pages.length > 0,
          })}
        />

        {pages.length > 0 && (
          <button
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-sm border border-neutral-700 bg-neutral-700/50 p-1 text-xs hover:bg-neutral-500/50 focus-visible:bg-neutral-500/50 focus-visible:outline-hidden"
            type="button"
            onClick={handleBack}
          >
            <FaArrowLeft />
          </button>
        )}
      </div>

      <List />
    </Command.Dialog>
  );
};
