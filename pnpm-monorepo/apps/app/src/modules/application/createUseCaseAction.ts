import {
  createAuthenticatedAction,
  type ActionGate,
  type ActionSuccess,
  type Translations,
} from "@/modules/actions/utils/createAction";
import type { Actor, ApplicationContext } from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { getApplicationContext } from "./getApplicationContext";
import {
  mapApplicationErrorToActionResponse,
  type ApplicationErrorTexts,
} from "./mapApplicationErrorToActionResponse";
import { toActor } from "./toActor";

/** Whether the page shows the new state after a successful use case */
export enum ActionRefresh {
  Always = "always",
  Never = "never",
}

const EMPTY_INPUT_SCHEMA = z.object({});

interface UseCaseActionOptions<Schema extends z.ZodTypeAny, Output> {
  /** The name of the action in the traces and in the logs */
  readonly name: string;
  /** `z.object({})` by default, for a use case that takes no input */
  readonly schema?: Schema;
  readonly useCase: (
    context: ApplicationContext,
    actor: Actor,
    input: z.output<Schema>,
  ) => Promise<Output>;
  /** See `createAuthenticatedAction()` */
  readonly parseFormData?: (formData: FormData) => unknown;
  /** `ActionGate.Clearance` by default */
  readonly gate?: ActionGate;
  /** A record, or a function of `t` for the texts that use a common text */
  readonly texts?:
    ApplicationErrorTexts | ((t: Translations) => ApplicationErrorTexts);
  /**
   * `ActionRefresh.Always` by default. A function refreshes only when it
   * gives true, for example only when the use case changed something.
   */
  readonly refresh?: ActionRefresh | ((output: Output) => boolean);
}

/** The answer after a successful use case: a text, or a different page */
type UseCaseActionResult<Output, Fields> =
  | {
      readonly success: (t: Translations, output: Output) => string;
      /** For example `notificationsFailedWarning()` */
      readonly warning?: (
        t: Translations,
        output: Output,
      ) => string | undefined;
      /**
       * More fields of the success response, for the client component, which
       * gets them from `runAction()`. For example a flag that tells the
       * client to fetch its cache again.
       */
      readonly responseFields?: (output: Output) => Fields;
      readonly redirect?: never;
    }
  | {
      /** The path of the page that the action opens */
      readonly redirect: (output: Output) => string;
      readonly success?: never;
      readonly warning?: never;
      readonly responseFields?: never;
    };

type UseCaseActionDefinition<
  Schema extends z.ZodTypeAny,
  Output,
  Fields,
> = UseCaseActionOptions<Schema, Output> & UseCaseActionResult<Output, Fields>;

const shouldRefresh = <Output>(
  option: UseCaseActionOptions<z.ZodTypeAny, Output>["refresh"],
  output: Output,
) =>
  typeof option === "function"
    ? option(output)
    : option !== ActionRefresh.Never;

/**
 * A server action that runs one use case for the user of the session: the
 * standard shape of the thin action wrappers. After the use case, the action
 * refreshes the page (see `refresh`) and answers with the texts of `success`
 * and `warning` and the `responseFields`, or opens the page of `redirect`.
 * The redirect is outside of the error mapping, because `redirect()` throws.
 * An action that does more (a cookie, an app-only option, its own `catch`)
 * calls `createAuthenticatedAction()` itself.
 */
export const createUseCaseAction = <
  Schema extends z.ZodTypeAny = typeof EMPTY_INPUT_SCHEMA,
  Output = unknown,
  Fields extends object = Record<never, never>,
>(
  definition: UseCaseActionDefinition<Schema, Output, Fields>,
) =>
  createAuthenticatedAction<Schema, ActionSuccess & Fields>(
    definition.name,
    /** Without a schema, `Schema` is its default, the type of the fallback */
    (definition.schema ?? EMPTY_INPUT_SCHEMA) as Schema,
    async (formData, authentication, data, t) => {
      let output: Output;
      try {
        output = await definition.useCase(
          getApplicationContext(),
          await toActor(authentication.session),
          data,
        );
      } catch (error) {
        return mapApplicationErrorToActionResponse(error, {
          formData,
          t,
          texts:
            typeof definition.texts === "function"
              ? definition.texts(t)
              : definition.texts,
        });
      }

      if (shouldRefresh(definition.refresh, output)) refresh();

      if (definition.redirect) redirect(definition.redirect(output));

      const warning = definition.warning?.(t, output);

      return {
        success: definition.success(t, output),
        ...(warning === undefined ? {} : { warning }),
        // Without `responseFields`, `Fields` is its default without keys
        ...(definition.responseFields?.(output) ?? ({} as Fields)),
      };
    },
    { parseFormData: definition.parseFormData, gate: definition.gate },
  );
