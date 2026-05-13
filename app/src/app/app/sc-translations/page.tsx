import { requireAuthenticationPage } from "@/modules/auth/server";
import { Button2 } from "@/modules/common/components/Button2";
import { RichText } from "@/modules/common/components/RichText";
import screenshot from "@/modules/sc-translations/assets/screenshot.png";
import Image from "next/image";
import { FaExternalLinkAlt } from "react-icons/fa";

export default async function Page() {
  await requireAuthenticationPage("/app/sc-translations");

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="bg-secondary rounded-primary p-4">
        <h1 className="text-3xl font-bold font-mono uppercase mb-2">
          SC Translations
        </h1>

        <RichText>
          <p>
            Community-Übersetzung für Star Citizen, die Informationen über
            Blueprint Rewards zu Contracts hinzufügt. Contracts mit Blueprint
            Reward werden mit <code>[BP]</code> im Titel markiert und listen die
            möglichen Rewards in der Beschreibung auf. Zusätzlich werden
            Komponenten-Typ/Größe/Stufe vorangestellt und der Mining-Guide im
            Journal nach Seltenheit sortiert.
          </p>
        </RichText>

        <div className="mt-4">
          <Button2
            as="a"
            href="https://github.com/MrKraken/StarStrings/releases/latest"
            target="_blank"
            rel="noreferrer"
          >
            Download <FaExternalLinkAlt />
          </Button2>
        </div>
      </div>

      <div className="bg-secondary rounded-primary p-4">
        <h2 className="text-2xl font-bold font-mono uppercase mb-4">
          Screenshot
        </h2>

        <Image
          src={screenshot}
          alt="SC Translations Screenshot"
          className="rounded-secondary"
        />
      </div>

      <div className="bg-secondary rounded-primary p-4">
        <h2 className="text-2xl font-bold font-mono uppercase mb-4">
          Installation
        </h2>

        <RichText>
          <ol>
            <li>Lade die neueste Version herunter.</li>

            <li>Entpacke die ZIP-Datei.</li>

            <li>
              Falls du bereits eine <code>user.cfg</code> hast, füge am Ende
              folgende Zeile hinzu: <code>g_language = english</code>. Falls du
              keine <code>user.cfg</code> hast, erstelle eine neue Datei und
              füge diese Zeile hinzu.
            </li>

            <li>
              Kopiere den <code>data</code>-Ordner und die <code>user.cfg</code>
              -Datei in das Verzeichnis deines LIVE-Ordners.
            </li>
          </ol>

          <div className="bg-black rounded-secondary p-4 mt-4 font-mono text-sm">
            <div>StarCitizen/</div>

            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ LIVE/</div>

            <div>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─
              user.cfg
            </div>

            <div>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─
              data/
            </div>

            <div>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─
              Localization/
            </div>

            <div>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─
              english/
            </div>

            <div>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─
              global.ini
            </div>
          </div>
        </RichText>
      </div>

      <div className="bg-secondary rounded-primary p-4">
        <h2 className="text-2xl font-bold font-mono uppercase mb-4">Hinweis</h2>

        <RichText>
          <p>
            Nach neuen Patches muss die <code>global.ini</code> aktualisiert
            werden.
          </p>
        </RichText>
      </div>
    </div>
  );
}
