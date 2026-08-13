import { authOptions } from "@/modules/auth/server";
import NextAuth from "next-auth";

/**
 * NextAuth's App Router handler is typed `any`; give it the route-handler
 * shape Next.js expects.
 */
const handler = NextAuth(authOptions) as (
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) => Promise<Response>;

export { handler as GET, handler as POST };
