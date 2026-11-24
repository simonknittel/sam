/** The seasonal banner has its own preview: the seasonal date override */
export enum GreetingBannerPreview {
  Welcome = "welcome",
  Birthday = "birthday",
}

export const GREETING_BANNER_PREVIEW_LABELS: Record<
  GreetingBannerPreview,
  string
> = {
  [GreetingBannerPreview.Welcome]: "Welcome",
  [GreetingBannerPreview.Birthday]: "Birthday",
};
