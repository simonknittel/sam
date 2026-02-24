import { prisma } from "@/db";
import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { RichText } from "@/modules/common/components/RichText";
import { RoadmapNote } from "@/modules/help/components/RoadmapNote";
import { SectionHeading } from "@/modules/help/components/SectionHeading";
import { TableOfContents } from "@/modules/help/components/TableOfContents";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Mithilfe",
};

export default async function Page() {
  await requireAuthenticationPage("/app/help/contributing");

  const ind3x = await prisma.entity.findFirst({
    where: {
      handle: "ind3x",
    },
  });

  return (
    <MaxWidthContent className="mt-4 flex flex-col lg:flex-row-reverse lg:items-start gap-4">
      <TableOfContents
        items={[
          {
            title: "Mithilfe",
            href: "#mithilfe",
          },

          {
            title: "Arten der Mithilfe",
            href: "#arten-der-mithilfe",
          },

          {
            title: "Integrierte Apps",
            href: "#integrierte-apps",
          },

          {
            title: "Externe Apps",
            href: "#externe-apps",
            items: [
              {
                title: "Iframe-Integration",
                href: "#iframe-integration",
              },
              {
                title: "Benutzerauthentifizierung / Single Sign-on (SSO)",
                href: "#benutzerauthentifizierung-single-sign-on-sso",
              },
              {
                title: "REST-Schnittstellen",
                href: "#rest-schnittstellen",
              },
              {
                title: "Webhooks",
                href: "#webhooks",
              },
            ],
          },

          {
            title: "Frequently Asked Questions (FAQ)",
            href: "#frequently-asked-questions-faq",
            items: [
              {
                title: "Bei wem melde ich mich?",
                href: "#bei-wem-melde-ich-mich",
              },
              {
                title: "Wie starte ich?",
                href: "#wie-starte-ich",
              },
              {
                title:
                  "Ich habe eine (externe) App entwickelt. Wie kann ich diese Hosten, damit sie im S.A.M. integriert werden kann?",
                href: "#wie-hoste-ich-meine-app",
              },
              {
                title:
                  "Wann sind die in der Roadmap genannten Funktionen verfügbar?",
                href: "#wann-verfügbar",
              },
            ],
          },
        ]}
      />

      <div className="flex-1 flex flex-col gap-2">
        <section className="background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#mithilfe`}
            level={1}
            className="mb-4"
          >
            Mithilfe
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Du hast eine Idee, einen Verbesserungsvorschlag oder einen Wunsch
              f&uuml;r&apos;s S.A.M.? Oder, du m&ouml;chtest sogar selbst an der
              Entwicklung des S.A.M. mitwirken?
            </p>

            <p>
              Hier bekommst du eine Übersicht dar&uuml;ber, wie du uns bei der
              Entwicklung des S.A.M. unterstützen kannst.
            </p>
          </RichText>
        </section>

        <section className="background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#arten-der-mithilfe`}
            className="mb-4"
          >
            Arten der Mithilfe
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Solltest du einen Fehler entdecken oder hast sonst irgendwelche
              Probleme mit dem S.A.M., melde dich einfach bei uns und wir
              versuchen das Problem schnellstmöglich zu beheben.
            </p>

            <p>
              Du hast einen Wunsch oder auch nur eine grobe Idee, kannst
              allerdings nicht selber entwickeln? Melde dich auch einfach bei
              uns und wir schauen gemeinsam, wie wir deinen Wunsch umsetzen
              können.
            </p>

            <p>
              Solltest du selber entwickeln können, gibt es grundsätzlich zwei
              Möglichkeiten um neue Funktionen in das S.A.M. zu integrieren:
            </p>
          </RichText>

          <ul className="grid grid-cols-2 gap-2 font-bold mt-4 hyphens-auto ml-9">
            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              Integrierte Apps
            </li>

            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              Externe Apps
            </li>
          </ul>
        </section>

        <section className="mt-[2px] background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#integrierte-apps`}
            className="mb-4"
          >
            Integrierte Apps
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Integrierte Apps werden direkt in der Codebase des S.A.M. mit
              aufgenommen. Sie haben hierdurch vollen Zugriff auf alle Inhalte
              und Funktionen des restlichen S.A.M. Zusätzlich ist das User
              Interface an die Gestaltung des S.A.M. angepasst.
            </p>

            <p>
              Um an der Codebase mitarbeiten zu können, muss Erfahrung in der
              Softwareentwicklung und dem entsprechenden Tech Stack (im
              wesentlichen Next.js) vorhanden sein.
            </p>
          </RichText>
        </section>

        <section className="mt-[2px] background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#externe-apps`}
            className="mb-4"
          >
            Externe Apps
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Externe Apps leben außerhalb der Codebase des S.A.M. Sie verwenden
              einen eigenen Tech Stack und werden auf eigenen Servern gehostet.
              Auch folgen sie ihrem eigenen Projektmanagement.
            </p>

            <p>
              Durch diese Separation verlieren sie die Möglichkeit des direkten
              Zugriffs auf die Funktionen und Inhalte des S.A.M., haben
              allerdings freie Flexibilität im Projektmanagement und
              Entwicklung.
            </p>
          </RichText>

          <RoadmapNote className="ml-9 mt-4 max-w-[65ch]">
            Damit auch Member mit geringerem Entwicklungshintergrund eine
            externe App entwickeln können, überlegen wir zurzeit, ob wir eine
            Low-/No-Code Platform zur Verfügung stellen.
            <br />
            Diese Platform ermöglicht es über eine grafische Oberfläche einfache
            Apps zu entwickeln und hosten.
            <br />
            Dieser Bereich wird ergänzt, sobald es hierzu weitere Details gibt.
          </RoadmapNote>

          <RichText className="ml-9 mt-4">
            <p>
              Damit trotzdem eine teilweise Integration ins S.A.M. und Zugriff
              auf Funktionen und Daten des S.A.M. möglich ist, bieten wir diesen
              externen Apps folgende Funktionen an:
            </p>
          </RichText>

          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-bold my-4 hyphens-auto ml-9">
            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              Iframe-Integration
            </li>

            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              Benutzerauthentifizierung / Single Sign-on (SSO)
            </li>

            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              REST-Schnittstellen
            </li>

            <li className="background-secondary rounded-secondary p-8 flex text-center justify-center items-center">
              Webhooks
            </li>
          </ul>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#iframe-integration`}
            level={3}
            className="mt-8 mb-4"
          >
            Iframe-Integration
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Externe Apps können per Iframe in das S.A.M. integriert werden.
              Dadurch bleibt der Benutzer im bekannten Interface des S.A.M. und
              kann nahtlos zwischen den integrierten und externen Apps wechseln.
            </p>

            <p>
              Damit das Iframe durch Browser nicht blockiert wird, müssen
              folgende Header angepasst werden:
            </p>

            <ul>
              <li>
                <strong>Content-Security-Policy:</strong> Die{" "}
                <code>frame-ancestors</code>-Direktive muss die Domain des
                S.A.M. enthalten (Beispiel:{" "}
                <code>frame-ancestors &apos;self&apos; {env.HOST}</code>).
              </li>
              <li>
                <strong>X-Frame-Options:</strong> Dieser Header muss entweder
                entfernt werden. Dieser Header wird durch den CSP-Header
                überflüssig.
              </li>
            </ul>

            <p>
              Die Iframes werden standardmäßig mit dem <code>sandbox</code>
              -Attribut eingebunden, welches folgende Werte enthält:{" "}
              <code>
                allow-scripts allow-same-origin allow-forms allow-downloads
              </code>
              . App-spezifische Anpassungen sind möglich.
            </p>

            <p>
              Bei internen Verlinkungen (bspw.{" "}
              <code>&lt;a href=&quot;/my-page&quot;&gt;/my-page&lt;/a&gt;</code>
              ) darf das <code>target</code>-Attribut nicht den Wert{" "}
              <code>_top</code> oder <code>_parent</code> haben.
            </p>

            <p>
              Cookies benötigen das <code>SameSite=None</code>-Attribut sowie
              das <code>Secure</code>-Attribut.
            </p>
          </RichText>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#benutzerauthentifizierung-single-sign-on-sso`}
            level={3}
            className="mt-8 mb-4"
          >
            Benutzerauthentifizierung / Single Sign-on (SSO)
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Das S.A.M. kann für deine externe App die
              Benutzerauthentifizierung übernehmen. Hierbei übernimmt das S.A.M.
              die Rolle des Identity Provider. Die Benutzer deiner App melden
              sich hierbei über S.A.M. an und werden im Anschluss im
              authentifizierten Zustand zu deiner App weitergeleitet.
            </p>

            <p>
              Als Protokoll wird OAuth2 verwendet. S.A.M. ist der Server und
              deine App ist der Client.
            </p>

            <p>
              Zusätzlich bietet das S.A.M. eine SCIM-Schnittstelle an. Hierüber
              können Benutzer in deiner App automatisiert provisioniert und
              deprovisioniert werden. Beispiel: Sollte ein Benutzer im S.A.M.
              gelöscht werden, dann kann diese Information über SCIM an deine
              App weitergeleitet werden, so dass der Benutzer auch in deiner App
              gelöscht wird.
            </p>
          </RichText>

          <RoadmapNote className="ml-9 mt-4 max-w-[65ch]">
            Diese Funktionen stehen aktuell noch nicht zur Verfügung, befinden
            sich aber in der Entwicklung.
            <br />
            Dieser Bereich wird ergänzt, sobald es hierzu weitere Details gibt.
          </RoadmapNote>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#rest-schnittstellen`}
            level={3}
            className="mt-8 mb-4"
          >
            REST-Schnittstellen
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Über REST-Schnittstellen stehen Daten aus dem S.A.M. für den Abruf
              durch externe Apps zu Verfügung. Einige Daten werden allerdings
              aufgrund ihrer Sicherheitseinstufung nicht für externe Apps zur
              Verfügung stehen.
            </p>

            <p>
              Für die Schnittstellen wird zwingend die Benutzerauthentifizierung
              über SSO vorausgesetzt.
            </p>
          </RichText>

          <RoadmapNote className="ml-9 mt-4 max-w-[65ch]">
            Diese Funktion steht aktuell noch nicht zur Verfügung, befindet sich
            aber in der Entwicklung.
            <br />
            Dieser Bereich wird ergänzt, sobald es hierzu weitere Details gibt.
          </RoadmapNote>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#webhooks`}
            level={3}
            className="mt-8 mb-4"
          >
            Webhooks
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Externe Apps haben die Möglichkeit mithilfe von Webhooks auf
              diverse Ereignisse im S.A.M. zu reagieren.
            </p>
          </RichText>

          <RoadmapNote className="ml-9 mt-4 max-w-[65ch]">
            Diese Funktion steht aktuell noch nicht zur Verfügung, befindet sich
            aber in der Entwicklung.
            <br />
            Dieser Bereich wird ergänzt, sobald es hierzu weitere Details gibt.
          </RoadmapNote>
        </section>

        <section className="mt-[2px] background-secondary rounded-primary p-4">
          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#frequently-asked-questions-faq`}
            className="mb-4"
          >
            Frequently Asked Questions (FAQ)
          </SectionHeading>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#bei-wem-melde-ich-mich`}
            level={3}
            className="mt-8 mb-4"
          >
            Bei wem melde ich mich?
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Bei sämtlichen Fragen, Problemen und Wünschen zu dem oben
              Beschriebenem, kannst du dich bei <CitizenLink citizen={ind3x} />{" "}
              melden. Ich bin am schnellsten über Discord erreichbar.
            </p>
          </RichText>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#wie-starte-ich`}
            level={3}
            className="mt-8 mb-4"
          >
            Wie starte ich?
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Wenn du an den integrierten Apps mitarbeiten möchtest und du
              denkst den strengen Anforderungen von ind3x zu bestehen, dann
              melde dich gerne bei uns.
            </p>

            <p>
              Wenn du an einer externen App arbeiten möchtest, kannst du direkt
              mit dem Tech Stack deiner Wahl beginnen. Wenn du soweit bist,
              kannst du dich gerne bei uns melden und wir schauen gemeinsam, wie
              wir deine App in das S.A.M. integrieren können.
            </p>
          </RichText>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#wie-hoste-ich-meine-app`}
            level={3}
            className="mt-8 mb-4"
          >
            Ich habe eine (externe) App entwickelt. Wie kann ich diese Hosten,
            damit sie im S.A.M. integriert werden kann?
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Das Hosting deiner App hängt stark von dem verwendeten Tech Stack
              und der Architektur ab. Eine allgemeine Antwort können wir dir
              hier daher nicht geben. Melde dich gerne bei uns für eine
              persönliche Beratung.
            </p>
          </RichText>

          <SectionHeading
            url={`${env.BASE_URL}/app/help/contributing#wann-verfügbar`}
            level={3}
            className="mt-8 mb-4"
          >
            Wann sind die in der Roadmap genannten Funktionen verfügbar?
          </SectionHeading>

          <RichText className="ml-9">
            <p>
              Die Entwicklung des S.A.M. erfolgt in der Freizeit von uns. Daher
              können wir keinen genauen Zeitpunkt für die Fertigstellung von
              Funktionen nennen.
            </p>
          </RichText>
        </section>
      </div>
    </MaxWidthContent>
  );
}
