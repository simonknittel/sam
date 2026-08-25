"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FaRegTimesCircle } from "react-icons/fa";
import { useIsLargeViewport } from "../hooks/useIsLargeViewport";
import { useOnboardingTarget } from "../hooks/useOnboardingTarget";
import { useTargetRect } from "../hooks/useTargetRect";
import { getOnboardingTaskByKey, type OnboardingStep } from "../utils/config";
import { useOnboarding, type ActiveOnboardingTour } from "./OnboardingProvider";

export const OnboardingTour = () => {
  const { activeTour } = useOnboarding();
  if (!activeTour) return null;

  /**
   * Keyed by the task so all tour-internal state resets when another tour
   * starts.
   */
  return <OnboardingTourView key={activeTour.taskKey} tour={activeTour} />;
};

interface OnboardingTourViewProps {
  readonly tour: ActiveOnboardingTour;
}

const OnboardingTourView = ({ tour }: OnboardingTourViewProps) => {
  const { eligibleTasks, advanceTour, retreatTour, exitTour } = useOnboarding();
  const pathname = usePathname();
  const router = useRouter();

  const taskConfig = getOnboardingTaskByKey(tour.taskKey);
  const eligibleTask = eligibleTasks.find(
    (taskCandidate) => taskCandidate.key === tour.taskKey,
  );

  const steps =
    taskConfig && eligibleTask
      ? taskConfig.steps.filter((step) =>
          eligibleTask.stepKeys.includes(step.key),
        )
      : [];

  const step = steps.at(tour.stepIndex);

  useEffect(() => {
    if (!step) exitTour();
  }, [step, exitTour]);

  const requiredRoute = step?.route;
  const isOnRequiredRoute = !requiredRoute || pathname === requiredRoute;

  useEffect(() => {
    if (!requiredRoute || pathname === requiredRoute) return;
    router.push(requiredRoute);
  }, [requiredRoute, pathname, router]);

  const { element, hasTimedOut } = useOnboardingTarget(
    step?.targetId,
    isOnRequiredRoute,
  );

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") exitTour();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitTour]);

  /**
   * When the tour ends, return the focus to the (visible) trigger — it
   * would otherwise be dropped on the body behind the closed overlay.
   */
  useEffect(() => {
    return () => {
      const triggers = document.querySelectorAll<HTMLElement>(
        'button[title="Erste Schritte"]',
      );
      for (const trigger of triggers) {
        if (trigger.offsetParent !== null) {
          trigger.focus();
          return;
        }
      }
    };
  }, []);

  if (!step) return null;

  if (!isOnRequiredRoute || (step.targetId && !element && !hasTimedOut))
    return <TourWaitingOverlay />;

  return (
    <OnboardingStepCard step={step} targetElement={element} onExit={exitTour}>
      <TourStepControls
        stepNumber={tour.stepIndex + 1}
        stepCount={steps.length}
        onBack={retreatTour}
        onNext={advanceTour}
      />
    </OnboardingStepCard>
  );
};

/** Dims the page while a navigation or the target lookup is in flight */
const TourWaitingOverlay = () => {
  return (
    <div className="fixed inset-0 z-70 bg-neutral-800/50 backdrop-blur-sm flex items-center justify-center">
      <AsciiSpinner />
    </div>
  );
};

/** Space between the highlighted element and the edge of the cutout */
const CUTOUT_PADDING_PIXELS = 8;

/**
 * Share of the viewport height above which a target counts as oversized.
 * For such targets (e.g. a whole table section) the card docks to the
 * bottom of the viewport instead of floating next to the element, which
 * would put it off-screen.
 */
const OVERSIZED_TARGET_VIEWPORT_SHARE = 0.6;

/** Scroll offset which keeps an oversized target below the fixed top bar */
const OVERSIZED_TARGET_SCROLL_OFFSET_PIXELS = 128;

interface OnboardingStepCardProps {
  readonly step: OnboardingStep;
  /** Null renders the centered variant instead of the anchored one */
  readonly targetElement: HTMLElement | null;
  readonly onExit: () => void;
  readonly children: ReactNode;
}

/**
 * A tour step in a full-viewport layer above everything else (including the
 * mobile flyout): the page is dimmed and inert. With a target element, a
 * cutout frame highlights it and the step card floats next to it; without
 * one, the card is centered. On small viewports the card docks to the
 * bottom of the screen instead.
 */
const OnboardingStepCard = ({
  step,
  targetElement,
  onExit,
  children,
}: OnboardingStepCardProps) => {
  const isLargeViewport = useIsLargeViewport();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const targetRect = useTargetRect(targetElement);

  const isOversizedTarget = Boolean(
    targetRect &&
    targetRect.height > window.innerHeight * OVERSIZED_TARGET_VIEWPORT_SHARE,
  );

  const isFloating =
    Boolean(targetElement) && isLargeViewport && !isOversizedTarget;

  const { refs, floatingStyles } = useFloating({
    elements: { reference: targetElement },
    placement: "bottom",
    middleware: [
      offset(CUTOUT_PADDING_PIXELS * 2),
      flip(),
      shift({ padding: CUTOUT_PADDING_PIXELS }),
    ],
    whileElementsMounted: autoUpdate,
  });

  /* eslint-disable react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-pass-data-to-parent -- Scrolling the found target into view is imperative DOM work on an external system, not an event handler and not data passed to a parent. */
  useEffect(() => {
    if (!targetElement) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior = prefersReducedMotion
      ? ("auto" as const)
      : ("smooth" as const);

    const rect = targetElement.getBoundingClientRect();
    if (rect.height > window.innerHeight * OVERSIZED_TARGET_VIEWPORT_SHARE) {
      /**
       * Centering an oversized target would scroll its top (for the org
       * fleet: the metrics) out of view — align the top instead.
       */
      window.scrollBy({
        top: rect.top - OVERSIZED_TARGET_SCROLL_OFFSET_PIXELS,
        behavior,
      });
      return;
    }

    targetElement.scrollIntoView({ block: "center", behavior });
  }, [targetElement]);
  /* eslint-enable react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-pass-data-to-parent */

  useEffect(() => {
    cardRef.current?.focus();
  }, [step.key]);

  /**
   * Minimal focus trap: the page behind the overlay is inert for the
   * pointer, so Tab must not wander off into it either.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const card = cardRef.current;
    if (!card) return;

    const focusableElements = Array.from(
      card.querySelectorAll<HTMLElement>("button, [href]"),
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    /**
     * -1 means the focus sits on the card itself — the initial state of
     * every step. Treat it like the first element, so Shift+Tab wraps to
     * the end instead of escaping into the page behind the overlay.
     */
    const activeIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement,
    );

    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      activeIndex === focusableElements.length - 1
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-70">
      {targetElement && targetRect ? (
        <div
          className="absolute rounded-secondary shadow-[0_0_0_9999px_rgba(23,23,23,0.7)] ring-2 ring-amber-500/80 pointer-events-none"
          style={{
            top: targetRect.top - CUTOUT_PADDING_PIXELS,
            left: targetRect.left - CUTOUT_PADDING_PIXELS,
            width: targetRect.width + CUTOUT_PADDING_PIXELS * 2,
            height: targetRect.height + CUTOUT_PADDING_PIXELS * 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800/50 backdrop-blur-sm" />
      )}

      <div
        ref={(node) => {
          refs.setFloating(node);
          cardRef.current = node;
        }}
        style={isFloating ? floatingStyles : undefined}
        className={clsx(
          "bg-black border border-white/20 rounded-secondary p-4 outline-hidden",
          {
            "w-96 max-w-[calc(100dvw-1rem)]": isFloating,
            /**
             * Wider than the anchored card: centered steps carry
             * screenshots, which need the room to stay readable.
             */
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] max-w-[calc(100dvw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto":
              !targetElement && isLargeViewport,
            "fixed bottom-2 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100dvw-1rem)]":
              Boolean(targetElement) && isLargeViewport && isOversizedTarget,
            "fixed left-2 right-2 bottom-2 max-h-[calc(100dvh-1rem)] overflow-y-auto":
              !isLargeViewport,
          },
        )}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="font-bold font-mono uppercase text-balance">
            {step.title}
          </p>

          <button
            type="button"
            title="Tour beenden"
            onClick={onExit}
            className="text-xl text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-300 cursor-pointer"
          >
            <FaRegTimesCircle />
          </button>
        </div>

        <div className="mt-2 text-sm">{step.content()}</div>

        {children}
      </div>
    </div>
  );
};

interface TourStepControlsProps {
  readonly stepNumber: number;
  readonly stepCount: number;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

const TourStepControls = ({
  stepNumber,
  stepCount,
  onBack,
  onNext,
}: TourStepControlsProps) => {
  const isFirstStep = stepNumber <= 1;
  const isLastStep = stepNumber >= stepCount;

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <span className="text-sm text-neutral-500">
        Schritt {stepNumber} von {stepCount}
      </span>

      <div className="flex gap-2">
        {!isFirstStep && (
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={onBack}
          >
            Zurück
          </Button2>
        )}

        <Button2 type="button" onClick={onNext}>
          {isLastStep ? "Fertig" : "Weiter"}
        </Button2>
      </div>
    </div>
  );
};
