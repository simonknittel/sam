import { LOREM_IPSUM_PLACEHOLDER } from "@/modules/common/utils/loremIpsumPlaceholder";
import { random } from "lodash";

const SingleNoteRedacted = () => {
  return (
    <article className="mt-4 lg:mt-8 relative p-4">
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
    </article>
  );
};

export default SingleNoteRedacted;
