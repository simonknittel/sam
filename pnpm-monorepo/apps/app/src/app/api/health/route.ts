import { NextResponse } from "next/server";

/**
 * Public by design: the health check of the host calls it without a session.
 * It gives no data.
 */
export const GET = () => {
  return NextResponse.json({ status: "ok" });
};
