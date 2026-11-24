import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findOnboardingState,
  type OnboardingState,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Null for sessions without a citizen — those never see the onboarding feature
 * — and without a session or clearance
 */
export const getOnboardingState = cache(
  withTrace("getOnboardingState", async (): Promise<OnboardingState | null> => {
    const actor = await getOptionalRequestActor();
    if (!actor) return null;

    return findOnboardingState(getApplicationContext(), actor);
  }),
);
