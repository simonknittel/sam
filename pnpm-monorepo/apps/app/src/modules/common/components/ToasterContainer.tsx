"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import {
  ToastBar,
  Toaster,
  type DefaultToastOptions,
  type Toast,
} from "react-hot-toast";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

/**
 * An error toast is often the only place that shows the error of a server
 * action, and the error can be long (for example a list of role names).
 * 10 s are sufficient to read approximately 30 words. A pointer on the toast
 * stops the time.
 */
const ERROR_TOAST_DURATION_MS = 10_000;

const ERROR_OPTIONS = { duration: ERROR_TOAST_DURATION_MS };

const TOAST_OPTIONS: DefaultToastOptions = { error: ERROR_OPTIONS };

/**
 * The default icons of react-hot-toast pop in with keyframes of the library,
 * which the reduced-motion rule in `globals.css` does not reach. An icon
 * element replaces them without an animation.
 */
const REDUCED_MOTION_TOAST_OPTIONS: DefaultToastOptions = {
  success: { icon: <FaCheckCircle className="size-5 text-green-500" /> },
  error: {
    ...ERROR_OPTIONS,
    icon: <FaTimesCircle className="size-5 text-red-500" />,
  },
};

/**
 * The wrapper around the toasts is their only live region. A live region in
 * a different live region can make a screen reader announce a toast two
 * times.
 */
const TOAST_ARIA_PROPS: Toast["ariaProps"] = {
  role: "status",
  "aria-live": "off",
};

const ToasterContainer = () => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    { defaultMatches: false },
  );

  return (
    /**
     * A modal dialog of Base UI hides all elements outside of the dialog from
     * screen readers (`aria-hidden`). It keeps only the elements with an
     * `aria-live` attribute that exist when the dialog opens. A toast comes
     * later, thus this wrapper must always exist.
     */
    <div aria-live="polite">
      <Toaster
        toastOptions={
          prefersReducedMotion ? REDUCED_MOTION_TOAST_OPTIONS : TOAST_OPTIONS
        }
      >
        {(toast) => (
          <ToastBar toast={{ ...toast, ariaProps: TOAST_ARIA_PROPS }} />
        )}
      </Toaster>
    </div>
  );
};

export default ToasterContainer;
