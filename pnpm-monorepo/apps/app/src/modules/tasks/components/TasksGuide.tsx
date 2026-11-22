import { Guide } from "@/modules/common/components/Guide/Guide";
import { GuideCard } from "@/modules/common/components/Guide/GuideCard";
import { GuideCardList } from "@/modules/common/components/Guide/GuideCardList";
import {
  GuideFeatureColumns,
  GuideFeatureList,
} from "@/modules/common/components/Guide/GuideFeatureList";
import { GuideHighlight } from "@/modules/common/components/Guide/GuideHighlight";
import { GuideIntro } from "@/modules/common/components/Guide/GuideIntro";
import { GuideSection } from "@/modules/common/components/Guide/GuideSection";
import { GuideStep } from "@/modules/common/components/Guide/GuideStep";
import { GuideStepList } from "@/modules/common/components/Guide/GuideStepList";
import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import {
  FaCoins,
  FaEye,
  FaFileLines,
  FaHandshake,
  FaListCheck,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaRepeat,
  FaSeedling,
  FaUser,
  FaUsers,
} from "react-icons/fa6";
import createScreenshot from "../assets/guide/create.webp";
import detailScreenshot from "../assets/guide/detail.webp";
import listScreenshot from "../assets/guide/list.webp";
import { TasksGuideStateFlow } from "./TasksGuideStateFlow";

interface Props {
  readonly className?: string;
}

export const TasksGuide = ({ className }: Props) => {
  return (
    <Guide
      subtitle="Was Tasks sind und wie du sie erledigst"
      className={className}
    >
      <GuideIntro
        heading="Aufträge mit Belohnung"
        lead="Tasks sind das Quest-System der Organisation. Ein Mitglied erstellt eine Aufgabe mit einer Belohnung, Citizens erledigen sie, und der Ersteller bestätigt, wer sie erfüllt hat."
        highlights={
          <>
            <GuideHighlight icon={FaCoins} title="SILC als Belohnung">
              Die SILC zählen für deinen Anteil bei SINcome.
            </GuideHighlight>

            <GuideHighlight icon={FaUsers} title="Für alle oder gezielt">
              Öffentliche Tasks kann jeder annehmen, andere richten sich an
              ausgewählte Citizens.
            </GuideHighlight>

            <GuideHighlight icon={FaRepeat} title="Wiederholbar">
              Ein wiederholbarer Task kommt nach dem Erfüllen wieder, bis alle
              Wiederholungen erledigt sind.
            </GuideHighlight>
          </>
        }
        screenshot={listScreenshot}
        screenshotAlt="Die Liste der offenen Tasks mit den Filtern"
      />

      <GuideSection
        heading="So erledigst du einen Task"
        lead="Vom Finden bis zur Belohnung in vier Schritten"
      >
        <GuideStepList>
          <GuideStep number={1} icon={FaMagnifyingGlass} title="Task finden">
            Die Liste zeigt die offenen Tasks. Mit den Filtern siehst du zum
            Beispiel nur neue Tasks oder die, die du angenommen hast.
          </GuideStep>

          <GuideStep number={2} icon={FaHandshake} title="Annehmen">
            Öffne den Task und wähle <UiLabel>Annehmen</UiLabel>. Hat er ein
            Teilnehmerlimit oder erforderliche Rollen, können ihn nur passende
            Citizens annehmen.
          </GuideStep>

          <GuideStep number={3} icon={FaListCheck} title="Erledigen">
            Erledige die Aufgabe vor dem Ablaufdatum. Mit{" "}
            <UiLabel>Aufgeben</UiLabel> gibst du den Task wieder frei.
          </GuideStep>

          <GuideStep number={4} icon={FaCoins} title="Belohnung erhalten">
            Der Ersteller bestätigt, wer den Task erfüllt hat. Bei einer
            SILC-Belohnung bekommt jeder davon die SILC.
          </GuideStep>
        </GuideStepList>
      </GuideSection>

      <GuideSection
        heading="Zielgruppen"
        lead="Wer einen Task sieht und erledigen kann"
      >
        <GuideCardList>
          <GuideCard icon={FaEye} title="Öffentlich">
            Jeder kann den Task annehmen und erfüllen. Erforderliche Rollen und
            ein Teilnehmerlimit schränken das auf Wunsch ein.
          </GuideCard>

          <GuideCard icon={FaUsers} title="Gruppe">
            Ein Task für ausgewählte Citizens. Nur sie sehen ihn und erfüllen
            ihn gemeinsam.
          </GuideCard>

          <GuideCard icon={FaUser} title="Personalisiert">
            Ein eigener Task für jeden ausgewählten Citizen. Nur dieser Citizen
            sieht ihn und muss ihn erfüllen.
          </GuideCard>
        </GuideCardList>
      </GuideSection>

      <GuideSection heading="Belohnungen" lead="Was du für einen Task bekommst">
        <GuideCardList>
          <GuideCard icon={FaCoins} title="SILC">
            Der Ersteller zahlt die SILC von seinem eigenen Konto. Der Task
            zeigt dann „SILC (Tausch)“.
          </GuideCard>

          <GuideCard icon={FaSeedling} title="Neue SILC">
            Die SILC werden neu ausgegeben. Diese Belohnung können nur bestimmte
            Rollen vergeben.
          </GuideCard>

          <GuideCard icon={FaPenToSquare} title="Freitext">
            Eine Belohnung außerhalb von SILC, zum Beispiel ein Platz bei einem
            Event.
          </GuideCard>
        </GuideCardList>
      </GuideSection>

      <GuideSection heading="Der Status eines Tasks">
        <TasksGuideStateFlow />
      </GuideSection>

      <GuideSection
        heading="In der App"
        lead="Ein Klick auf einen Screenshot zeigt ihn in voller Größe."
      >
        <GuideFeatureList
          columns={GuideFeatureColumns.Two}
          features={[
            {
              icon: FaFileLines,
              title: "Details eines Tasks",
              screenshot: detailScreenshot,
              screenshotAlt:
                "Die Seite eines Tasks mit Status, Belohnung, Teilnehmern, Zielgruppe, Briefing und dem Button zum Annehmen",
              content: (
                <>
                  Status, Belohnung, freie Plätze und Ablaufdatum auf einen
                  Blick, darunter die Teilnehmer, die Zielgruppe und das
                  Briefing. Unter „Meine Teilnahme“ nimmst du den Task an.
                </>
              ),
            },
            {
              icon: FaPlus,
              title: "Neuer Task",
              screenshot: createScreenshot,
              screenshotAlt:
                "Der Dialog für einen neuen Task beim Schritt Zielgruppe",
              content: (
                <>
                  Mitglieder mit der passenden Rolle erstellen über{" "}
                  <UiLabel icon={FaPlus}>Neuer Task</UiLabel> eigene Tasks, in
                  vier Schritten: Briefing, Zielgruppe, Belohnung und Sonstiges.
                </>
              ),
            },
          ]}
        />
      </GuideSection>
    </Guide>
  );
};
