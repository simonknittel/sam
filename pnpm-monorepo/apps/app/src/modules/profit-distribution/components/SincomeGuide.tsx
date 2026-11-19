import { Guide } from "@/modules/common/components/Guide/Guide";
import {
  GuideFeatureColumns,
  GuideFeatureList,
} from "@/modules/common/components/Guide/GuideFeatureList";
import { GuideHighlight } from "@/modules/common/components/Guide/GuideHighlight";
import {
  GuideIntro,
  GuideIntroLayout,
} from "@/modules/common/components/Guide/GuideIntro";
import {
  GuideNote,
  GuideNoteVariant,
} from "@/modules/common/components/Guide/GuideNote";
import { GuideNoteList } from "@/modules/common/components/Guide/GuideNoteList";
import { GuideSection } from "@/modules/common/components/Guide/GuideSection";
import { GuideStep } from "@/modules/common/components/Guide/GuideStep";
import { GuideStepList } from "@/modules/common/components/Guide/GuideStepList";
import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import {
  FaCalculator,
  FaCoins,
  FaFlagCheckered,
  FaHandHoldingDollar,
  FaHandshake,
  FaScaleBalanced,
} from "react-icons/fa6";
import diagramSvg from "../assets/diagram.svg";
import collectionScreenshot from "../assets/guide/collection.webp";
import payoutScreenshot from "../assets/guide/payout.webp";
import { SincomeGuideCalculation } from "./SincomeGuideCalculation";

interface Props {
  readonly className?: string;
}

export const SincomeGuide = ({ className }: Props) => {
  return (
    <Guide
      subtitle="Wie SINcome funktioniert und wie du deinen Anteil bekommst"
      className={className}
    >
      <GuideIntro
        layout={GuideIntroLayout.Below}
        heading="Dein Anteil am Überschuss"
        lead="SINcome schüttet den aUEC-Überschuss der Organisation an die Mitglieder aus. Wie groß dein Anteil ist, hängt von den SILC ab, die du in einem Zeitraum verdienst. Die Grafik zeigt, wie die Zeiträume aufeinander folgen."
        highlights={
          <>
            <GuideHighlight icon={FaCoins} title="SILC verdienen">
              Zum Beispiel mit Tasks, bei Events und mit den Gehältern deiner
              Rollen.
            </GuideHighlight>

            <GuideHighlight icon={FaScaleBalanced} title="Fair geteilt">
              Jede SILC ist gleich viel wert. Je mehr SILC du sammelst, desto
              größer ist dein Anteil.
            </GuideHighlight>

            <GuideHighlight
              icon={FaHandHoldingDollar}
              title="Im Spiel ausgezahlt"
            >
              Economics zahlt dir deinen Anteil in aUEC aus, sobald du
              zugestimmt hast.
            </GuideHighlight>
          </>
        }
        screenshot={svgToStaticImageData(diagramSvg)}
        screenshotAlt="Zeitstrahl der Zeiträume: In jedem Quartal sammeln die Mitglieder SILC mit Events und Tasks, im nächsten Quartal folgt die Auszahlung."
      />

      <GuideSection
        heading="So läuft ein Zeitraum ab"
        lead="Jeder Zeitraum hat vier Phasen. Während die Auszahlung eines Zeitraums läuft, sammelst du schon für den nächsten."
      >
        <GuideStepList>
          <GuideStep number={1} icon={FaCoins} title="Sammelphase">
            Du verdienst SILC. Am Ende der Phase merkt sich das SAM deinen
            positiven Kontostand für die Auszahlung und setzt ihn auf 0. Ein
            negativer Kontostand bleibt.
          </GuideStep>

          <GuideStep
            number={2}
            icon={FaCalculator}
            title="Auszahlung wird vorbereitet"
          >
            Economics trägt den aUEC-Überschuss ein und startet die Auszahlung.
            Dann bekommst du eine Benachrichtigung.
          </GuideStep>

          <GuideStep number={3} icon={FaHandshake} title="Auszahlung">
            Wähle <UiLabel>Auszahlung zustimmen</UiLabel>, sobald du im
            aktuellen Patch einen Charakter hast. Economics zahlt dir deinen
            Anteil dann im Spiel aus.
          </GuideStep>

          <GuideStep number={4} icon={FaFlagCheckered} title="Abgeschlossen">
            Der Zeitraum ist beendet. Ein Anteil ohne Zustimmung ist verfallen
            und bleibt bei der Organisation.
          </GuideStep>
        </GuideStepList>
      </GuideSection>

      <GuideSection
        heading="So wird dein Anteil berechnet"
        lead="Ein Beispiel mit den Zahlen aus dem Screenshot der Auszahlung"
      >
        <SincomeGuideCalculation />

        <p className="mt-4 max-w-prose text-sm text-white/60">
          Wer seinen Anteil abtritt, zählt bei den SILC aller Teilnehmer nicht
          mit. So verteilt sich sein Anteil auf die anderen Mitglieder.
        </p>
      </GuideSection>

      <GuideSection
        heading="In der App"
        lead="Ein Klick auf einen Screenshot zeigt ihn in voller Größe."
      >
        <GuideFeatureList
          columns={GuideFeatureColumns.Two}
          features={[
            {
              icon: FaCoins,
              title: "Sammelphase",
              screenshot: collectionScreenshot,
              screenshotAlt:
                "Die Sammelphase eines Zeitraums mit den bisher verdienten SILC",
              content: (
                <>
                  Zeigt die SILC, die du im Zeitraum bisher verdient hast. Mit{" "}
                  <UiLabel>Anteil abtreten</UiLabel> überlässt du deinen Anteil
                  freiwillig den anderen Mitgliedern.
                </>
              ),
            },
            {
              icon: FaHandHoldingDollar,
              title: "Auszahlung",
              screenshot: payoutScreenshot,
              screenshotAlt:
                "Die Auszahlung eines Zeitraums mit dem Überschuss, dem eigenen Anteil und dem Button zum Zustimmen",
              content:
                "Zeigt den Überschuss, deinen Anteil und den Status deiner Auszahlung. Hier stimmst du der Auszahlung zu.",
            },
          ]}
        />
      </GuideSection>

      <GuideSection heading="Gut zu wissen">
        <GuideNoteList>
          <GuideNote variant={GuideNoteVariant.Warning}>
            Stimme erst zu, wenn du im aktuellen Patch einen Charakter erstellt
            hast. Sonst scheitert die Auszahlung, und dein Anteil geht
            unwiderruflich verloren.
          </GuideNote>

          <GuideNote>
            Stimmst du bis zum Ende der Auszahlung nicht zu, verfällt dein
            Anteil. Am Morgen des letzten Tages erinnert dich das SAM daran.
          </GuideNote>

          <GuideNote>
            SILC, die du nach dem Ende einer Sammelphase verdienst, zählen schon
            für den nächsten Zeitraum.
          </GuideNote>
        </GuideNoteList>
      </GuideSection>
    </Guide>
  );
};
