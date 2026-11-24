import {
  GreetingBanner,
  GreetingBannerMarker,
} from "@/modules/dashboard/components/GreetingBanner";
import {
  pickRandomWording,
  type ViewerWordingContext,
} from "@/modules/dashboard/utils/greetingWordings";
import { WELCOME_WORDINGS } from "../wordings/welcome";
import { WelcomeBannerCallToAction } from "./WelcomeBannerCallToAction";
import { WelcomeOrnament } from "./WelcomeOrnament";

interface Props {
  readonly context: ViewerWordingContext;
}

export const WelcomeGreetingBanner = ({ context }: Props) => {
  const wording = pickRandomWording(WELCOME_WORDINGS, context);
  if (!wording) return null;

  return (
    <GreetingBanner
      marker={GreetingBannerMarker.Welcome}
      surfaceClassName="background-welcome"
      hasConfetti
      ornament={<WelcomeOrnament className="size-full" />}
      title={wording.title}
      body={wording.body}
      callToAction={<WelcomeBannerCallToAction />}
    />
  );
};
