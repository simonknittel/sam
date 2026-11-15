import { Tile } from "@/modules/common/components/Tile";

interface Props {
  readonly className?: string;
}

export const AiAgentsOverviewTile = ({ className }: Props) => {
  return (
    <Tile
      className={className}
      heading="Was SAM für KI-Agenten bereitstellt"
      childrenClassName="flex flex-col gap-6"
    >
      <p>
        KI-Agenten wie Claude, ChatGPT oder Codex können mit SAM arbeiten. SAM
        gibt ihnen dafür zwei Dinge.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Offer
          title="MCP-Server"
          description="Das Model Context Protocol (MCP) verbindet einen KI-Agenten mit SAM. Mit den Tools des MCP-Servers liest und ändert der Agent Daten in SAM, zum Beispiel Events, Tasks, das Wiki oder die Flotte. Er darf dabei nur, was du selbst in SAM darfst."
          examples={[
            "Welche Events finden diese Woche statt?",
            "Melde mich für das Event am Samstag an.",
            "Welche Tasks kann ich gerade annehmen?",
            "Fasse die Wiki-Seite über Mining zusammen.",
          ]}
        />

        <Offer
          title="Skills"
          description="Skills sind Anleitungen für den Agenten. Sie erklären ihm die Apps von SAM, ihre Abläufe und die Berechtigungen. Der Agent liest sie, wenn er sie braucht, und nutzt die Tools dann richtig."
          examples={[
            "Welche Berechtigung braucht ein Mitglied, um Events zu erstellen?",
            "Wie funktioniert SINcome?",
            "Wo finde ich in SAM die Strafpunkte?",
          ]}
        />
      </div>
    </Tile>
  );
};

interface OfferProps {
  readonly title: string;
  readonly description: string;
  readonly examples: readonly string[];
}

const Offer = ({ title, description, examples }: OfferProps) => {
  return (
    <section className="min-w-0">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm">{description}</p>

      <p className="mt-4 text-sm text-neutral-500">Zum Beispiel:</p>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
        {examples.map((example) => (
          <li key={example}>&bdquo;{example}&ldquo;</li>
        ))}
      </ul>
    </section>
  );
};
