"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import { Toaster, type DefaultToastOptions } from "react-hot-toast";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

/**
 * The default icons of react-hot-toast pop in with keyframes of the library,
 * which the reduced-motion rule in `globals.css` does not reach. An icon
 * element replaces them without an animation.
 */
const REDUCED_MOTION_OPTIONS: DefaultToastOptions = {
  success: { icon: <FaCheckCircle className="size-5 text-green-500" /> },
  error: { icon: <FaTimesCircle className="size-5 text-red-500" /> },
};

const ToasterContainer = () => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    { defaultMatches: false },
  );

  return (
    <Toaster
      toastOptions={prefersReducedMotion ? REDUCED_MOTION_OPTIONS : undefined}
    />
  );
};

export default ToasterContainer;
