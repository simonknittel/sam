import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import {
  GREETING_BANNER_PREVIEW_COOKIE,
  parseGreetingBannerPreviewCookie,
} from "../utils/greetingBannerPreviewCookie";

export const getGreetingBannerPreview = cache(async () =>
  parseGreetingBannerPreviewCookie(
    (await cookies()).get(GREETING_BANNER_PREVIEW_COOKIE)?.value,
  ),
);
