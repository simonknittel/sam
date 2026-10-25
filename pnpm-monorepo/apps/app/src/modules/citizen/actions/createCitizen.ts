"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createCitizenInputSchema,
  createCitizen as createCitizenUseCase,
} from "@sam-monorepo/application";
import { CITIZEN_ERROR_TEXTS } from "../utils/citizenErrorTexts";

/**
 * Creates a citizen and opens its page. A known Spectrum ID opens its
 * citizen and creates no duplicate.
 *
 * In the browser, each redirect rejects the action with a redirect error
 * that Next.js handled already: the router opens the page, and the nearest
 * `RedirectBoundary` mounts its subtree again. This closes the create modal,
 * because its state is in that subtree. The success hook of the form does
 * not run.
 */
export const createCitizen = createUseCaseAction({
  name: "createCitizen",
  schema: createCitizenInputSchema,
  useCase: createCitizenUseCase,
  parseFormData: (formData) => ({ spectrum_id: formData.get("spectrumId") }),
  texts: CITIZEN_ERROR_TEXTS,
  refresh: (output) => output.created,
  redirect: (output) => `/app/spynet/citizen/${output.citizen_id}`,
});
