/**
 * Simple web server to locally simulate AWS Lambda. For now we omitted input validation
 * and error handling to keep it simple. On AWS these would be provided by the API
 * Gateway and respective Lambda handlers.
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";
import { midnightAutomationsHandler } from "./functions/midnight-automations/handler";
import { scrapeDiscordEventsHandler } from "./functions/scrape-discord-events/handler";

const app = new Hono();

app.use(async (c, next) => initializeRequestContext(null, async () => next()));

app.use("/*", cors());

app.post("/midnight-automations", async (c) => {
  try {
    await midnightAutomationsHandler();
    return c.json({}, 200);
  } catch (error) {
    log.error("Internal Server Error", { error });
    return c.json(
      {
        error: {
          message: "Internal Server Error",
        },
      },
      500,
    );
  }
});

app.post("/scrape-discord-events", async (c) => {
  try {
    await scrapeDiscordEventsHandler();
    return c.json({}, 200);
  } catch (error) {
    log.error("Internal Server Error", { error });
    return c.json(
      {
        error: {
          message: "Internal Server Error",
        },
      },
      500,
    );
  }
});

const port = 3001;

log.info("Local API started", { port });

serve({
  fetch: app.fetch,
  port,
});
