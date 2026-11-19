import { Guide } from "@/modules/common/components/Guide/Guide";
import {
  GuideFeatureColumns,
  GuideFeatureList,
} from "@/modules/common/components/Guide/GuideFeatureList";
import { GuideHighlight } from "@/modules/common/components/Guide/GuideHighlight";
import { GuideIntro } from "@/modules/common/components/Guide/GuideIntro";
import { GuideNote } from "@/modules/common/components/Guide/GuideNote";
import { GuideNoteList } from "@/modules/common/components/Guide/GuideNoteList";
import { GuideSection } from "@/modules/common/components/Guide/GuideSection";
import { GuideStep } from "@/modules/common/components/Guide/GuideStep";
import { GuideStepList } from "@/modules/common/components/Guide/GuideStepList";
import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import eventLineupScreenshot from "@/modules/onboarding/assets/event-aufstellung.png";
import {
  FaCalendarCheck,
  FaListUl,
  FaPeopleGroup,
  FaPlus,
  FaRocket,
  FaRotate,
  FaUserShield,
} from "react-icons/fa6";
import addScreenshot from "../assets/guide/add.webp";
import myShipsScreenshot from "../assets/guide/my-ships.webp";
import orgScreenshot from "../assets/guide/org.webp";

interface Props {
  readonly className?: string;
}

/**
 * The texts match the tour about the fleet in the onboarding (see the steps
 * of `OnboardingTaskKey.Fleet`), so that both explain the fleet in the same
 * words.
 */
export const FleetGuide = ({ className }: Props) => {
  return (
    <Guide
      subtitle="Wofür wir die Flotte erfassen und wie du deine Schiffe pflegst"
      className={className}
    >
      <GuideIntro
        heading="Unsere Flotte"
        lead="In der Flotten-App hinterlegst du die Schiffe, die du besitzt. Auf dieser Grundlage planen wir die Aufstellungen für unsere Events."
        highlights={
          <>
            <GuideHighlight icon={FaCalendarCheck} title="Für die Eventplanung">
              Wir sehen, mit welchen Schiffen wir bei einem Event rechnen
              können. Posten einer Aufstellung können bestimmte Schiffe
              verlangen.
            </GuideHighlight>

            <GuideHighlight icon={FaRocket} title="Die Org-Flotte">
              Alle Schiffe, die Mitglieder beigesteuert haben, gezählt nach
              Modell.
            </GuideHighlight>

            <GuideHighlight icon={FaUserShield} title="Geschützt">
              Welche Schiffe du besitzt, sehen nur ausgewählte Rollen.
            </GuideHighlight>
          </>
        }
        screenshot={orgScreenshot}
        screenshotAlt="Die Org-Flotte mit der Anzahl der Schiffe je Modell und dem Wert der Flotte"
      />

      <GuideSection
        heading="So pflegst du deine Schiffe"
        lead="Je aktueller deine Schiffe sind, desto besser können wir planen."
      >
        <GuideStepList>
          <GuideStep number={1} icon={FaListUl} title="Meine Schiffe öffnen">
            Unter <UiLabel>Meine Schiffe</UiLabel> siehst du alle Schiffe, die
            du hinterlegt hast.
          </GuideStep>

          <GuideStep number={2} icon={FaPlus} title="Schiff hinzufügen">
            Über <UiLabel icon={FaPlus}>Hinzufügen</UiLabel> fügst du ein Schiff
            zu deiner Flotte hinzu. Wähle das Modell aus und gib optional die
            Herkunft, einen Namen und eine Notiz an.
          </GuideStep>

          <GuideStep number={3} icon={FaRotate} title="Aktuell halten">
            Entferne Schiffe, die du nicht mehr besitzt, und füge neue gleich
            hinzu. So wissen wir, mit welchen Schiffen wir rechnen können.
          </GuideStep>
        </GuideStepList>
      </GuideSection>

      <GuideSection
        heading="Funktionen"
        lead="Ein Klick auf einen Screenshot zeigt ihn in voller Größe."
      >
        <GuideFeatureList
          columns={GuideFeatureColumns.Three}
          features={[
            {
              icon: FaListUl,
              title: "Meine Schiffe",
              screenshot: myShipsScreenshot,
              screenshotAlt:
                "Die eigenen Schiffe mit Name, Herkunft und Notiz und dem Wert der Flotte",
              content:
                "Deine Schiffe mit Name, Herkunft und Notiz. Die Kacheln oben zeigen den Wert deiner Flotte in USD und aUEC.",
            },
            {
              icon: FaPlus,
              title: "Schiff hinzufügen",
              screenshot: addScreenshot,
              screenshotAlt:
                "Der Dialog zum Hinzufügen eines Schiffs mit Modell, Herkunft, Name und Notiz",
              content:
                "Nur das Modell ist Pflicht. Die Herkunft unterscheidet Schiffe aus dem Store von Schiffen aus dem Spiel.",
            },
            {
              icon: FaPeopleGroup,
              title: "Aufstellung bei Events",
              screenshot: eventLineupScreenshot,
              screenshotAlt:
                "Die Aufstellung eines Events mit drei Posten und den zugeteilten Citizens",
              content:
                "Posten einer Aufstellung können bestimmte Schiffe verlangen. Halte deine Flotte aktuell, damit du für diese Posten infrage kommst.",
            },
          ]}
        />
      </GuideSection>

      <GuideSection heading="Wer sieht deine Schiffe?">
        <GuideNoteList>
          <GuideNote>
            Die Org-Flotte und die Flotte eines Events zeigen nur, wie viele
            Schiffe eines Modells es gibt, nicht, wem sie gehören.
          </GuideNote>

          <GuideNote>
            Bei Aufstellungen sehen die Organisatoren nur, ob ein Citizen die
            Schiffsanforderungen eines Postens erfüllt.
          </GuideNote>

          <GuideNote>
            Welche Schiffe ein einzelner Citizen besitzt, sehen nur ausgewählte
            Rollen mit der Berechtigung „Schiffe anderer Citizen einsehen“.
          </GuideNote>
        </GuideNoteList>
      </GuideSection>
    </Guide>
  );
};
