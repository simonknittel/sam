import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface EmailConfirmationProps {
  baseUrl: string;
  host: string;
  token: string;
}

export default function Email({
  baseUrl = "http://localhost:3000",
  host = "localhost:3000",
  token = "1234567890",
}: Readonly<EmailConfirmationProps>) {
  return (
    <Html>
      <Head />
      <Preview>
        Deine E-Mail-Adresse und die Datenschutzerklärung müssen bestätigt werden bevor du {host} nutzen
        kannst.
      </Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                "brand-red-500": "#BB2222",
              },
            },
          },
        }}
      >
        <Body className="bg-neutral-800 text-neutral-50 font-sans px-6 pt-2 pb-6">
          <Container className="mx-auto w-[480px]">
            <Text className="text-center text-5xl text-brand-red-500 font-extrabold uppercase">
              S.A.M.
            </Text>
            <Text className="font-bold">
              Deine E-Mail-Adresse und die <Link href={`${baseUrl}/api/confirm-email?token=${token}`} className="text-brand-red-500">Datenschutzerklärung</Link> müssen bestätigt werden bevor du{" "}
              <Link href={baseUrl} className="text-brand-red-500">
                {host}
              </Link>{" "}
              nutzen kannst.
            </Text>
            <Container className="text-center">
              <Button
                href={`${baseUrl}/api/confirm-email?token=${token}`}
                className="rounded uppercase gap-4 text-base font-bold bg-brand-red-500 text-neutral-50 px-6 py-4"
              >
                Bestätigen
              </Button>
            </Container>
            <Text>
              Falls der Button nicht funktioniert, öffne folgenden Link in
              deinem Browser:{" "}
              <Link
                href={`${baseUrl}/api/confirm-email?token=${token}`}
                className="text-brand-red-500"
              >
                {baseUrl}/api/confirm-email?token={token}
              </Link>
            </Text>
            <Text>
              Falls du diese E-Mail nicht erwartet hast, melde dich bei{" "}
              <Link
                href="mailto:info@sinister-incorporated.de"
                className="text-brand-red-500"
              >
                info@sinister-incorporated.de
              </Link>
            </Text>
            <Hr />
            <Container className="text-center text-sm">
              <Container>
                <Link
                  href={`${baseUrl}/imprint`}
                  className="text-brand-red-500"
                >
                  Impressum
                </Link>{" "}
                •{" "}
                <Link
                  href={`${baseUrl}/privacy`}
                  className="text-brand-red-500"
                >
                  Datenschutzerklärung
                </Link>
              </Container>
              Sinister Incorporated
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
