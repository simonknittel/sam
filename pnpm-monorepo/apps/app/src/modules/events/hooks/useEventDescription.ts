import { useEffect, useRef, useState, type RefObject } from "react";

interface EventDescriptionState {
  readonly description: string;
  readonly setDescription: (description: string) => void;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * @param defaultValue Accepts the union returned by
 * `getDefaultValueWithFallback`
 */
export const useEventDescription = (
  defaultValue: string | number | readonly string[] | undefined,
): EventDescriptionState => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const defaultText = typeof defaultValue === "string" ? defaultValue : "";
  const [description, setDescription] = useState(defaultText);

  /**
   * The field is uncontrolled, because a controlled one loses its text when
   * React puts the form back to its default values after an action. The
   * preview therefore follows the field in two steps. First the reset, which
   * gives the field the default value of that moment — the event comes
   * before the values change, thus the field is read after the browser has
   * finished.
   */
  useEffect(() => {
    const form = textareaRef.current?.form;
    if (!form) return;

    const handleReset = () =>
      setTimeout(() => {
        if (textareaRef.current) setDescription(textareaRef.current.value);
      });

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  /**
   * And second a new default value, which a saved event brings a moment after
   * the reset.
   */
  const [previousDefaultText, setPreviousDefaultText] = useState(defaultText);
  if (defaultText !== previousDefaultText) {
    setPreviousDefaultText(defaultText);
    setDescription(defaultText);
  }

  return { description, setDescription, textareaRef };
};
