"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import clsx from "clsx";
import {
  resolveValue,
  ToastBar,
  Toaster,
  type DefaultToastOptions,
  type Toast,
} from "react-hot-toast";

/**
 * An error toast is often the only place that shows the error of a server
 * action, and the error can be long (for example a list of role names).
 * 10 s are sufficient to read approximately 30 words. A pointer on the toast
 * stops the time.
 */
const ERROR_TOAST_DURATION_MS = 10_000;

const ERROR_OPTIONS = { duration: ERROR_TOAST_DURATION_MS };

const TOAST_OPTIONS: DefaultToastOptions = { error: ERROR_OPTIONS };

interface ToastIconProps {
  readonly className: string;
  readonly symbolPath: string;
}

/**
 * The icons are drawn inline: each page shows toasts, and an icon package
 * would add its full icon chunk also to the public pages.
 */
const ToastIcon = ({ className, symbolPath }: ToastIconProps) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={clsx(className, "size-5 shrink-0")}
  >
    <circle cx="10" cy="10" r="10" fill="currentColor" />
    <path
      d={symbolPath}
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The default icons of react-hot-toast pop in with keyframes of the library,
 * which the reduced-motion rule in `globals.css` does not reach. An icon
 * element replaces them without an animation.
 */
const REDUCED_MOTION_TOAST_OPTIONS: DefaultToastOptions = {
  success: {
    icon: <ToastIcon className="text-green-500" symbolPath="M6 10.5l3 3 5-6" />,
  },
  error: {
    ...ERROR_OPTIONS,
    icon: (
      <ToastIcon className="text-red-500" symbolPath="M7 7l6 6M13 7l-6 6" />
    ),
  },
};

interface ToastMessageProps {
  readonly toast: Toast;
}

/**
 * The message of a toast with the styles of react-hot-toast, but without its
 * `role="status"` and `aria-live`: the wrapper of the toasts is their only
 * live region. A live region in a different live region can make a screen
 * reader announce a toast two times, and one with `aria-live="off"` hides the
 * changes of a toast, for example a loading toast that changes to its
 * result. Other toasts can select the message with `data-toast-message`.
 */
const ToastMessage = ({ toast }: ToastMessageProps) => (
  <div
    data-toast-message
    className="mx-2.5 my-1 flex flex-auto justify-center whitespace-pre-line"
  >
    {resolveValue(toast.message, toast)}
  </div>
);

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
          <ToastBar toast={toast}>
            {({ icon }) => (
              <>
                {icon}
                <ToastMessage toast={toast} />
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </div>
  );
};

export default ToasterContainer;
