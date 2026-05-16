import { requireAuthenticationPage } from "@/modules/auth/server";
import image20260214RoleTooltip from "@/modules/changelog/assets/2026-02-14-role-tooltip.png";
import image20260301CitizenPopover from "@/modules/changelog/assets/2026-03-01-citizen-popover.png";
import image20260510Career from "@/modules/changelog/assets/2026-05-10-career.png";
import image20260510CitizenPopover from "@/modules/changelog/assets/2026-05-10-citizen-popover.png";
import image20260510OverviewTab from "@/modules/changelog/assets/2026-05-10-overview-tab.png";
import image20260510ProfileTile from "@/modules/changelog/assets/2026-05-10-profile-tile.png";
import { Day } from "@/modules/changelog/components/Day";
import { DayItem } from "@/modules/changelog/components/DayItem";
import { Navigation } from "@/modules/changelog/components/Navigation";
import { RedactedDayItem } from "@/modules/changelog/components/RedactedDayItem";
import { Link } from "@/modules/common/components/Link";
import Image from "next/image";

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/changelog");
  const [showSystemLog] = await Promise.all([
    authentication.authorize("systemLog", "read"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Navigation activeYear="2026" />

      <Day heading="16. Mai 2026">
        <DayItem heading="Suchen-Filter" badges={["Neu"]}>
          <p>
            Die Filter von diversen Apps (bspw. Flotte) wurde um eine Suche
            erweitert.
          </p>
        </DayItem>

        <DayItem heading="Suchen-Filter" badges={["Neu", "Flotte"]}>
          <p>
            Die Filter der Flotten- und Schiffstabellen wurden um einen Filter
            für Hersteller erweitert.
          </p>
        </DayItem>

        <DayItem heading="Changelog - Jahr" badges={["Neu", "Changelog"]}>
          <p>Der Changelog ist nun nach Jahr aufgeteilt.</p>
        </DayItem>
      </Day>

      <Day heading="15. Mai 2026">
        <DayItem heading="Flotte - Schiffe löschen" badges={["Neu", "Flotte"]}>
          <p>
            Gelöschte Schiffe werden nicht mehr endgültig aus der Datenbank
            entfernt, sondern nur als gelöscht markiert. Sie können auf der
            Seite &ldquo;Meine Schiffe&rdquo; über den Filter
            &ldquo;Gelöscht&rdquo; wieder angezeigt und berücksichtigt werden.
          </p>

          <p>
            Zusätzlich werden nun alle Änderungen an Schiffen mit Zeitstempeln
            und dem verantwortlichen Benutzer protokolliert (&ldquo;erstellt
            am&rdquo;, &ldquo;erstellt von&rdquo;, &ldquo;aktualisiert
            am&rdquo;, &ldquo;aktualisiert von&rdquo;, &ldquo;gelöscht
            am&rdquo;, &ldquo;gelöscht von&rdquo;).
          </p>
        </DayItem>

        <DayItem heading="Flotte - Detailseiten" badges={["Neu", "Flotte"]}>
          <p>
            Es gibt nun eine Detailseite für jedes Schiff. Die Seite zeigt den
            Namen, die Serien- und Herstellerzuordnung, Tags, den
            Flight-ready-Status, externe Links zu anderen Diensten.
          </p>

          <p>
            Der Zugriff ist für Benutzer mit der Berechtigung &ldquo;Schiffe
            verwalten&rdquo; oder &ldquo;Org-Flotte lesen&rdquo; möglich.
          </p>
        </DayItem>

        <DayItem heading="Flotte - Änderungen" badges={["Neu", "Flotte"]}>
          <p>
            Eine neue Seite &ldquo;Änderungen&rdquo; zeigt alle Erstellungen und
            Löschungen von Schiffen in einer tabellarischen Übersicht. Die
            Änderungen können nach Variant, Eigentümer, Akteur und Typ gefiltert
            werden.
          </p>

          <p>
            Der Zugriff erfordert die Berechtigung &ldquo;Andere Schiffe
            lesen&rdquo;.
          </p>
        </DayItem>
      </Day>

      <Day heading="14. Mai 2026">
        <DayItem heading="Rollen - Beschreibungsfeld" badges={["Neu", "IAM"]}>
          <p>
            Rollen können nun eine Beschreibung erhalten. Die Beschreibung wird
            in der Rollenübersicht und im Rollen-Badge angezeigt.
          </p>
        </DayItem>
      </Day>

      <Day heading="12. Mai 2026">
        <DayItem
          heading="Org-Flotte - Alle Varianten anzeigen"
          badges={["Änderung", "Flotte"]}
        >
          <p>
            Die Org-Flotte zeigt nun alle verfügbaren Varianten an, auch wenn
            kein Org-Mitglied eine besitzt. Diese Varianten werden mit 0 in der
            &ldquo;Anzahl&rdquo;-Spalte dargestellt.
          </p>
        </DayItem>

        <DayItem
          heading="Meine Schiffe - Neues Layout"
          badges={["Änderung", "Flotte"]}
        >
          <p>
            Die Übersicht &ldquo;Meine Schiffe&rdquo; wurde neu gestaltet und
            entspricht nun dem Layout der anderen Apps wie Events und Tasks.
          </p>
        </DayItem>
      </Day>

      <Day heading="11. Mai 2026">
        <DayItem heading="Rollen - Neues Layout" badges={["Änderung", "IAM"]}>
          <p>
            Die Übersicht der Rollen wurde neu gestaltet und entspricht nun dem
            Layout der anderen Apps wie Events und Tasks.
          </p>
        </DayItem>

        <DayItem heading="Benutzer - Neues Layout" badges={["Änderung", "IAM"]}>
          <p>
            Die Übersicht der Benutzer wurde neu gestaltet und entspricht nun
            dem Layout der anderen Apps wie Events und Tasks.
          </p>
        </DayItem>
      </Day>

      <Day heading="10. Mai 2026">
        <DayItem
          heading="Levelbare Rollen"
          badges={["Neu", "Rollen", "Karriere"]}
        >
          <p>
            Eine Rolle kann nun levelbar geschaltet werden. Levelbare Rollen
            haben ein maximales Level. Erst wenn dieses Level erreicht ist, gilt
            diese Rolle als freigeschaltet für den jeweiligen Citizen. Erst ab
            diesem Moment greifen Berechtigungen und die Rolle erscheint visuell
            (z.B. in Karriere) als aktiv.
          </p>

          <p>
            Die Level können von Citizen mit der Berechtigung Rollen zu vergeben
            und nehmen angepasst werden.
          </p>

          <div className="grid grid-cols-2 grid-rows-[128px_128px] gap-2">
            <Link href={image20260510CitizenPopover.src}>
              <Image
                quality={100}
                src={image20260510CitizenPopover}
                alt=""
                loading="eager"
                className="max-h-full w-auto"
              />
            </Link>

            <Link href={image20260510ProfileTile.src}>
              <Image
                quality={100}
                src={image20260510ProfileTile}
                alt=""
                loading="eager"
                className="max-h-full w-auto"
              />
            </Link>

            <Link href={image20260510Career.src}>
              <Image
                quality={100}
                src={image20260510Career}
                alt=""
                loading="eager"
                className="max-h-full w-auto"
              />
            </Link>

            <Link href={image20260510OverviewTab.src}>
              <Image
                quality={100}
                src={image20260510OverviewTab}
                alt=""
                loading="eager"
                className="max-h-full w-auto"
              />
            </Link>
          </div>
        </DayItem>

        <DayItem
          heading="Flotte - Neues Layout"
          badges={["Änderung", "Flotte"]}
        >
          <p>
            Die Übersicht der Organisationsflotte wurde neu gestaltet und
            entspricht nun dem Layout der anderen Apps wie Events und Tasks.
          </p>
        </DayItem>
      </Day>

      <Day heading="6. Mai 2026">
        <DayItem
          heading="Automatische Rollen-Zuweisung"
          badges={["Neu", "Rollen"]}
        >
          <p>
            Einer Rolle kann nun eine automatische Zuweisung nach einer
            bestimmten Anzahl an Tagen der Inaktivität konfiguriert werden.
            Citizen, die sich innerhalb dieses Zeitraums nicht angemeldet haben,
            erhalten die Rolle automatisch.
          </p>

          <p>
            Hierüber kann bspw. die &ldquo;Gesperrt&rdquo;-Rolle automatisch an
            inaktive Member zugewiesen werden, um deren Login-Berechtigung zu
            entziehen.
          </p>
        </DayItem>

        <DayItem
          heading="Benachrichtigung wenn Event bald beginnt"
          badges={["Neu", "Benachrichtigungen"]}
        >
          <p>
            Du kannst nun 15 Minuten vor Beginn eines Events benachrichtigt
            werden, wenn du Teilnehmer bist.
          </p>

          <p>
            Die neue Benachrichtigung kann aktiviert werden unter:{" "}
            <Link
              href="/app/account/notifications"
              className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
            >
              Apps &gt; Account &gt; Benachrichtigungen
            </Link>
          </p>
        </DayItem>

        <DayItem
          heading="System-Protokoll für automatische Rollen-Änderungen"
          badges={["Neu", "System Log"]}
        >
          <p>
            Automatische Rollen-Zuweisungen und -Entfernungen werden nun im
            System-Protokoll protokolliert. Dies ermöglicht eine bessere
            Nachverfolgung der Änderungen.
          </p>
        </DayItem>

        <DayItem
          heading="Formatierung von Posten in der Aufstellung"
          badges={["Neu", "Events"]}
        >
          <p>
            Posten in der Event-Aufstellung können nun individuell formatiert
            werden. Bei der Bearbeitung eines Posten lassen sich die
            Schriftgröße (Normal und Groß), die Hintergrundfarbe und die
            Textfarbe konfigurieren.
          </p>
        </DayItem>
      </Day>

      <Day heading="5. Mai 2026">
        <DayItem
          heading="Strafpunkte - Neues Layout"
          badges={["Änderung", "Strafpunkte"]}
        >
          <p>
            Die Strafpunkte-Übersicht wurde neu gestaltet und entspricht nun dem
            Layout der anderen Apps wie Events und Tasks. Die Einträge werden
            nun als flache Liste mit Pagination angezeigt (50 pro Seite).
          </p>

          <p>
            Ein neuer Filter ermöglicht es, abgelaufene Strafpunkte ein- oder
            auszublenden. Der Filter ist auch auf der Detailseite pro Citizen
            verfügbar.
          </p>
        </DayItem>

        <DayItem
          heading="Pagination für SILC-Transaktionen"
          badges={["Neu", "SILC"]}
        >
          <p>
            Die SILC-Transaktionen werden nun paginiert angezeigt (100 pro
            Seite). Dies verbessert die performance bei vielen Transaktionen.
          </p>
        </DayItem>

        <DayItem
          heading="SILC-Benachrichtigung bei Gehalt und Task-Erledigung"
          badges={["Neu", "SILC", "Benachrichtigungen"]}
        >
          <p>
            Du wirst nun auch benachrichtigt, wenn du SILC durch dein Gehalt
            erhältst oder wenn du einen Task mit SILC-Belohnung erfüllst.
          </p>
        </DayItem>
      </Day>

      <Day heading="24. März 2026">
        {showSystemLog ? (
          <DayItem heading="System Log" badges={["Neu", "Apps"]}>
            <p>
              Es gibt eine neue App &ldquo;System Log&rdquo; welche eine
              Auflistung aller Ereignisse im SAM anzeigt. Die Logs werden mit
              der Zeit detaillierter und besser.
            </p>

            <p>
              Es gibt eine neue Berechtigung unter &ldquo;Sonstiges&rdquo; um
              den Zugriff auf das System Log zu limitieren. Benutzer mit dieser
              Berechtigung können vertrauliche Informationen und
              personenbezogene Daten einsehen.
            </p>
          </DayItem>
        ) : (
          <RedactedDayItem />
        )}
      </Day>

      <Day heading="1. März 2026">
        <DayItem heading="Tooltip für Citizen" badges={["Neu", "Citizen"]}>
          <p>
            Citizen haben nun ein Tooltip in welchem die wichtigsten Details zum
            jeweiligen Citizen angezeigt werden. Von hier aus können direkt die
            Rollen des Citizens eingesehen und bearbeitet werden.
          </p>

          <p>
            Zukünftig werden hier auch die Organisationen angezeigt, in welchen
            der Citizen Mitglied ist.
          </p>

          <Link href={image20260301CitizenPopover.src}>
            <Image quality={100} src={image20260301CitizenPopover} alt="" />
          </Link>
        </DayItem>
      </Day>

      <Day heading="14. Februar 2026">
        <DayItem heading="Tooltip für Rollen" badges={["Neu", "Citizen"]}>
          <p>
            Rollen haben nun ein Tooltip in welchem alle Details zu der
            jeweiligen Rolle angezeigt werden. Auch kann direkt hier die
            jeweilige Rolle von einem Citizen entfernt werden.
          </p>

          <p>
            Zukünftig wird hier das aktuelle Level von levelbaren Rollen
            gezeigt. Auch kann direkt hier das Level angepasst werden.
          </p>

          <Link href={image20260214RoleTooltip.src}>
            <Image
              quality={100}
              src={image20260214RoleTooltip}
              alt=""
              loading="lazy"
            />
          </Link>
        </DayItem>
      </Day>

      <Day heading="6. Februar 2026">
        <DayItem heading="Projekte" badges={["Neu", "Apps"]}>
          <p>
            Mit der neuen App &ldquo;Projekte&rdquo; kannst du nun den
            Fortschritt unserer Org-internen Projekte verfolgen.
          </p>

          <p>Diese App wird bereitgestellt von GeronBraginson und Redilian.</p>

          <p>
            Die App ist zu finden unter{" "}
            <Link
              href="/app/external/projects"
              className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
            >
              Apps &gt; Projekte
            </Link>
          </p>
        </DayItem>
      </Day>

      <Day heading="31. Januar 2026">
        <DayItem
          heading="Akzeptanzdatum bei Auszahlungsstatus anzeigen"
          badges={["Änderung", "Gewinnausschüttung"]}
        >
          <p>
            Bei ausstehenden Auszahlungen wird nun das Datum der Zustimmung
            angezeigt, damit besser nachvollzogen werden kann, wann die
            Zustimmung erfolgt ist.
          </p>
        </DayItem>
      </Day>

      <Day heading="26. Januar 2026">
        <DayItem heading="Favicon aktualisiert" badges={["Änderung"]}>
          <p>Das Favicon zeigt jetzt das SAM-Logo auf schwarzem Hintergrund.</p>
        </DayItem>
      </Day>

      <Day heading="18. Januar 2026">
        <DayItem
          heading="Transaktion erstellen über TopBar"
          badges={["Neu", "SILC"]}
        >
          <p>
            Du kannst jetzt SILC-Transaktionen direkt über den
            &ldquo;Neu&rdquo;-Button in der TopBar erstellen.
          </p>
        </DayItem>
      </Day>

      <Day heading="2. Januar 2026">
        <DayItem
          heading="Neuer Avatar-Rahmen"
          badges={["Änderung", "Avatar Creator"]}
        >
          <p>
            Der Rahmen im Avatar Creator wurde durch ein neues Design
            ausgetauscht.
          </p>

          <p>
            Du findest den Avatar Creator unter{" "}
            <Link
              href="/app/avatar-creator"
              className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
            >
              Apps &gt; Avatar Creator
            </Link>
            .
          </p>
        </DayItem>
      </Day>
    </div>
  );
}
