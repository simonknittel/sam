import clsx from "clsx";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  readonly className?: string;
}

export const DragPlaceholder = ({ className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      ref.current.style.left = `${e.clientX}px`;
      ref.current.style.top = `${e.clientY}px`;
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      {createPortal(
        <div
          ref={ref}
          className={clsx(
            "h-12 w-60 absolute bg-neutral-800/50 -translate-x-2 -translate-y-1/2 rounded-secondary pointer-events-none",
            className,
          )}
        />,
        document.body,
      )}
    </>
  );
};
