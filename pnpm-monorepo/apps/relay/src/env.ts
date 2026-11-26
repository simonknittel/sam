import * as z from "zod";

/** Reads an optional boolean flag of the environment ("true" or "false") */
const booleanFlagSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5220),
  /** The database of the app. The relay service writes the entries and reads the grants. */
  DATABASE_URL: z.string().min(1),
  /**
   * The base URL of the app, exactly as the app sees it: the issuer of the
   * connection tokens and of the tokens of the internal endpoints.
   */
  APP_BASE_URL: z.url({ protocol: /^https?$/ }),
  /**
   * The origin of the app in the browser: the only permitted `Origin` of a
   * browser connection. The default is the origin of APP_BASE_URL. The local
   * stacks set it, because there the pages of the app have a different port
   * than the issuer (a worktree, a Playwright worker).
   */
  APP_ORIGIN: z.optional(z.url({ protocol: /^https?$/ })),
  /**
   * The JSON Web Key Set of the app. The default is
   * `<APP_BASE_URL>/.well-known/jwks.json`. Set it when the relay service
   * reaches the app at a different address (for example from a container).
   */
  APP_JWKS_URL: z.optional(z.url({ protocol: /^https?$/ })),
  /**
   * The JSON Web Key Set of the app as base64 JSON. When set, the relay
   * service uses it and does not read APP_JWKS_URL. The local stacks set it
   * (see docs/setup-local-machine.md#remote-control-program-relay-service).
   */
  APP_JWKS_BASE64: z.optional(z.base64().max(16_384)),
  /**
   * The realtime server (Soketi, Pusher protocol). Without these values, the
   * relay service accepts uploads but delivers nothing in realtime.
   */
  PUSHER_CHANNELS_APP_ID: z.optional(z.string().min(1)),
  PUSHER_CHANNELS_APP_KEY: z.optional(z.string().min(1)),
  PUSHER_CHANNELS_APP_SECRET: z.optional(z.string().min(1)),
  PUSHER_CHANNELS_HOST: z.optional(z.string().min(1)),
  PUSHER_CHANNELS_PORT: z.optional(z.coerce.number().int().positive()),
  PUSHER_CHANNELS_USE_TLS: booleanFlagSchema,
  /**
   * The largest event that the realtime server accepts, in kilobytes (see
   * docs/setup-test-and-production.md#10-set-up-the-relay-service-of-the-remote-control-program).
   * The delivery splits a larger batch into more events.
   */
  PUSHER_CHANNELS_MAXIMUM_EVENT_PAYLOAD_KILOBYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100),
  /** Without the URL and the token, all parts of the program are on */
  UNLEASH_SERVER_API_URL: z.optional(z.url()),
  UNLEASH_SERVER_API_TOKEN: z.optional(z.string().min(1)),
  /** The Playwright stack sets the app name of each worker */
  UNLEASH_APP_NAME: z.string().min(1).default("sam-relay"),
  /** The refresh interval of the Unleash client (SDK default 15). The Playwright stack sets 1, like the app. */
  UNLEASH_REVALIDATE_SECONDS: z.coerce.number().int().positive().default(15),
  /** Without the endpoint, the relay service exports no metrics and no traces */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.optional(z.url()),
  OTEL_SERVICE_NAME: z.string().min(1).default("sam-relay"),
});

export type RelayEnvironment = z.infer<typeof schema>;

export const parseRelayEnvironment = (environment: NodeJS.ProcessEnv) =>
  schema.parse(environment);
