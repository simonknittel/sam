import { random } from "lodash";
import { LoremIpsum } from "lorem-ipsum";

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 3,
    min: 1,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

export const RedactedDayItem = () => {
  return (
    <li className="border-l-2 border-neutral-800/80 pl-5 relative py-3 pr-3">
      <strong className="block font-bold font-mono uppercase">
        Lorem ipsum
      </strong>

      <div className="mt-1 flex flex-col gap-2">
        <p>{lorem.generateParagraphs(1)}</p>
      </div>

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
    </li>
  );
};
