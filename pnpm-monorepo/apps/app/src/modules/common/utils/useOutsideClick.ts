import { useEffect, useState } from "react";

/**
 * **Example usage**
 * ```tsx
 * const { ref } = useOutsideClick(() => {
 *   console.log("clicked outside of div")
 * })
 *
 * return (
 *   <div ref={ref}>
 *     Lorem ipsum
 *   </div>
 * )
 * ```
 */
export const useOutsideClick = (handler: (event: MouseEvent) => void) => {
  const [current, ref] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!current || current.contains(event.target as Node)) return;

      handler(event);
    };

    document.addEventListener("mousedown", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
    };
  }, [current, handler]);

  return { ref };
};
