import { LOREM_IPSUM_PLACEHOLDER } from "@/modules/common/utils/loremIpsumPlaceholder";
import { random } from "lodash";

const SingleNoteRedacted = () => {
  return (
    <article className="relative mt-4 p-4 lg:mt-8">
      <p>{LOREM_IPSUM_PLACEHOLDER}</p>

      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
        <p
          className="relative rounded-secondary border-2 border-brand-red-500 px-2 py-1 text-lg font-bold text-brand-red-500"
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
