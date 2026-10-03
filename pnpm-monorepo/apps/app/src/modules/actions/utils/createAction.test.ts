import { authenticate } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as z from "zod";
import { createAuthenticatedAction } from "./createAction";

vi.mock("@/modules/auth/server", () => ({
  authenticate: vi.fn(),
}));

vi.mock("@/modules/auth/utils/emailConfirmation", () => ({
  requireConfirmedEmailForAction: vi.fn(),
}));

vi.mock("@/modules/logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { default: messages } = await import("../../../../messages/de.json");

  return {
    getTranslations: () =>
      Promise.resolve(createTranslator({ locale: "de", messages })),
  };
});

/** The support link of the message becomes plain text */
const INTERNAL_SERVER_ERROR_TEXT =
  "Ein unerwarteter Fehler ist aufgetreten. Bitte probiere es später erneut. Wenn der Fehler weiterhin auftritt, wende dich an den Support.";
const BAD_REQUEST_TEXT = "Ungültige Anfrage";

const spanExporter = new InMemorySpanExporter();

trace.setGlobalTracerProvider(
  new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(spanExporter)],
  }),
);

const getFinishedSpan = (name: string) => {
  const span = spanExporter
    .getFinishedSpans()
    .find((finishedSpan) => finishedSpan.name === name);
  if (!span) throw new Error(`The span ${name} did not end`);

  return span;
};

const schema = z.object({
  name: z.string().min(1),
});

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);

  return formData;
};

beforeEach(() => {
  spanExporter.reset();

  vi.mocked(authenticate).mockResolvedValue({
    session: { user: { id: "clhaw95yi0000jr08ybuvy137" } },
    authorize: () => Promise.resolve(true),
  } as unknown as Awaited<ReturnType<typeof authenticate>>);
});

describe("createAuthenticatedAction", () => {
  test("answers a thrown error with the internal server error, logs it and marks the span as failed", async () => {
    const thrownError = new Error("Database not reachable");
    const action = createAuthenticatedAction("failingAction", schema, () =>
      Promise.reject(thrownError),
    );
    const formData = createFormData({ name: "Aufgabe" });

    const response = await action(formData);

    expect(response).toEqual({
      error: INTERNAL_SERVER_ERROR_TEXT,
      requestPayload: formData,
    });
    expect(log.error).toHaveBeenCalledWith("Internal Server Error", {
      actionName: "failingAction",
      error: thrownError,
    });
    expect(getFinishedSpan("failingAction").status.code).toBe(
      SpanStatusCode.ERROR,
    );
  });

  test.each([
    {
      control: "redirect()",
      callback: () => redirect("/app/dashboard"),
      message: "NEXT_REDIRECT",
    },
    {
      control: "notFound()",
      callback: () => notFound(),
      message: "NEXT_HTTP_ERROR_FALLBACK;404",
    },
  ])(
    "rethrows $control and does not mark the span as failed",
    async ({ callback, message }) => {
      const action = createAuthenticatedAction(
        "controlFlowAction",
        schema,
        callback,
      );

      await expect(action(createFormData({ name: "Aufgabe" }))).rejects.toThrow(
        message,
      );

      expect(log.error).not.toHaveBeenCalled();
      expect(getFinishedSpan("controlFlowAction").status.code).toBe(
        SpanStatusCode.UNSET,
      );
    },
  );

  test("answers input that does not match the schema with a bad request", async () => {
    const implementation = vi.fn();
    const action = createAuthenticatedAction(
      "validatingAction",
      schema,
      implementation,
    );
    const formData = createFormData({ name: "" });

    const response = await action(formData);

    expect(response).toEqual({
      error: BAD_REQUEST_TEXT,
      requestPayload: formData,
    });
    expect(implementation).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith("Invalid Zod schema", {
      actionName: "validatingAction",
      error: expect.any(z.ZodError) as z.ZodError,
    });
    expect(getFinishedSpan("validatingAction").status.code).toBe(
      SpanStatusCode.UNSET,
    );
  });

  test("answers form data that its mapping cannot read with a bad request", async () => {
    const implementation = vi.fn();
    const action = createAuthenticatedAction(
      "mappingAction",
      z.object({ order: z.array(z.string()).max(10) }),
      implementation,
      {
        parseFormData: (formData) => ({
          order: JSON.parse(formData.get("order") as string) as unknown,
        }),
      },
    );
    const formData = createFormData({ order: "[" });

    const response = await action(formData);

    expect(response).toEqual({
      error: BAD_REQUEST_TEXT,
      requestPayload: formData,
    });
    expect(implementation).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith("Invalid form data", {
      actionName: "mappingAction",
      error: expect.any(SyntaxError) as SyntaxError,
    });
    expect(log.error).not.toHaveBeenCalled();
    expect(getFinishedSpan("mappingAction").status.code).toBe(
      SpanStatusCode.UNSET,
    );
  });
});
