import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { log } from "@/modules/logging";
import { channelsClient } from "@/modules/pusher/utils/channelsClient";
import { NextResponse } from "next/server";
import * as z from "zod";

const postBodySchema = z.object({
  socket_id: z.string(),
});

export async function POST(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/pusher/user-auth",
      "POST",
    );

    const body = await request.formData();
    const data = postBodySchema.parse({
      socket_id: body.get("socket_id"),
    });

    if (!channelsClient) {
      log.warn("[Pusher] Channels client not initialized.");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    const authResponse = channelsClient.authenticateUser(data.socket_id, {
      id: authentication.session.user.id,
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    return apiErrorHandler(error);
  }
}
