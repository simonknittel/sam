"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaSave, FaTrash } from "react-icons/fa";
import { updateWikiIframeAllowlist } from "../actions/updateWikiIframeAllowlist";
import { WIKI_HOSTNAME_PATTERN } from "../utils/wikiHostnamePattern";

interface Props {
  readonly initialDomains: readonly string[];
}

/**
 * Editable domain allowlist for generic iframes. Entries match their exact
 * hostname and all subdomains.
 */
export const WikiIframeAllowlistSettings = ({ initialDomains }: Props) => {
  const [domains, setDomains] = useState<string[]>([...initialDomains]);
  const [newDomain, setNewDomain] = useState("");

  const { state, formAction, isPending } = useAction(
    updateWikiIframeAllowlist,
    { errorToast: false },
  );

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!WIKI_HOSTNAME_PATTERN.test(domain)) {
      toast.error('Bitte eine gültige Domain angeben, z. B. "example.com".');
      return;
    }
    if (!domains.includes(domain)) setDomains([...domains, domain].toSorted());
    setNewDomain("");
  };

  return (
    <div>
      {domains.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between gap-2 rounded-secondary border border-neutral-800 px-3 py-2"
            >
              <span className="overflow-hidden text-ellipsis" title={domain}>
                {domain}
              </span>
              <Button2
                type="button"
                variant={Button2Variant.Secondary}
                onClick={() =>
                  setDomains(domains.filter((entry) => entry !== domain))
                }
                title={`"${domain}" entfernen`}
              >
                <FaTrash />
              </Button2>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-400">
          Keine Domains freigegeben. Eingebettete Websites (iframes) können
          nicht eingefügt werden.
        </p>
      )}

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addDomain();
        }}
      >
        <div className="flex-1">
          <TextInput
            label="Domain hinzufügen"
            placeholder="example.com"
            value={newDomain}
            onChange={(event) => setNewDomain(event.target.value)}
            required
          />
        </div>
        <Button2 type="submit" variant={Button2Variant.Secondary}>
          Hinzufügen
        </Button2>
      </form>

      <form action={formAction} className="mt-4">
        {domains.map((domain) => (
          <input key={domain} type="hidden" name="domain" value={domain} />
        ))}

        <Note
          type="info"
          className="mt-4"
          message="Eine Domain gilt auch für alle ihre Subdomains. Entfernte Domains werden auf bestehenden Seiten nicht mehr angezeigt."
        />

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </div>
  );
};
