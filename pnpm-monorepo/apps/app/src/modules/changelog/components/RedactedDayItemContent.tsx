import { LOREM_IPSUM_PLACEHOLDER } from "@/modules/common/utils/loremIpsumPlaceholder";
import { random } from "lodash";

export const RedactedDayItemContent = () => {
  return (
    <>
      <p>{LOREM_IPSUM_PLACEHOLDER}</p>

      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
        <p
          className="text-brand-red-500 font-bold border-2 border-brand-red-500 rounded-secondary px-2 py-1 text-lg relative"
          style={{
            transform: `rotate(${random(-15, 15)}deg)`,
            left: `${random(-100, 100)}px`,
          }}
        >
          Redacted
        </p>
      </div>
    </>
  );
};
