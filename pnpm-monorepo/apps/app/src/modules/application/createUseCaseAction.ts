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

export enum ActionRefresh {
  Always = "always",
  Never = "never",
}

const EMPTY_INPUT_SCHEMA = z.object({});

interface UseCaseActionOptions<Schema extends z.ZodTypeAny, Output> {
  /** The name of the action in the traces and in the logs */
  readonly name: string;
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
  readonly texts?:
    ApplicationErrorTexts | ((t: Translations) => ApplicationErrorTexts);
  readonly refresh?: ActionRefresh | ((output: Output) => boolean);
}

type UseCaseActionResult<Output, Fields> =
  | {
      readonly success: (t: Translations, output: Output) => string;
      /**
       * The client component gets these fields from `runAction()`, for example
       * a flag that tells the client to fetch its cache again.
       */
      readonly responseFields?: (output: Output) => Fields;
      readonly redirect?: never;
    }
  | {
      readonly redirect: (output: Output) => string;
      readonly success?: never;
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
 * The standard shape of the thin action wrappers. The redirect is outside of
 * the error mapping, because `redirect()` throws.
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

      return {
        success: definition.success(t, output),
        // Without `responseFields`, `Fields` is its default without keys
        ...(definition.responseFields?.(output) ?? ({} as Fields)),
      };
    },
    { parseFormData: definition.parseFormData, gate: definition.gate },
  );
