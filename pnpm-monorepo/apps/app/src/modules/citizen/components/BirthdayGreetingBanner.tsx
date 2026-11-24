import {
  GreetingBanner,
  GreetingBannerMarker,
} from "@/modules/dashboard/components/GreetingBanner";
import {
  pickRandomWording,
  type ViewerWordingContext,
} from "@/modules/dashboard/utils/greetingWordings";
import { BIRTHDAY_WORDINGS } from "../wordings/birthday";
import { BirthdayOrnament } from "./BirthdayOrnament";

interface Props {
  readonly context: ViewerWordingContext;
}

export const BirthdayGreetingBanner = ({ context }: Props) => {
  const wording = pickRandomWording(BIRTHDAY_WORDINGS, context);
  if (!wording) return null;

  return (
    <GreetingBanner
      marker={GreetingBannerMarker.Birthday}
      surfaceClassName="background-birthday"
      hasConfetti
      ornament={<BirthdayOrnament className="size-full" />}
      title={wording.title}
      body={wording.body}
    />
  );
};
