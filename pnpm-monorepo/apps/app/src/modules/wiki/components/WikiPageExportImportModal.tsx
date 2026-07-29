"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { FaFileExport, FaFileImport } from "react-icons/fa";
import { importWikiPageContent } from "../actions/importWikiPageContent";

const MAX_IMPORT_FILE_BYTES = 2_000_000;

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
}

/**
 * JSON export and import for wiki admins (see PLAN-wiki.md §9) behind a
 * single toolbar button. The export downloads the page's content as Tiptap
 * JSON; the import replaces it with an uploaded file. The file is read
 * client-side and sent as text — the server action validates it against
 * the editor schema and the iframe allowlist.
 */
export const WikiPageExportImportModal = ({
  className,
  pageId,
  title,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem("file");
    if (!(fileInput instanceof HTMLInputElement)) return;
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      toast.error("Die Datei ist zu groß (maximal 2 MB).");
      return;
    }

    startTransition(async () => {
      try {
        const content = await file.text();
        const formData = new FormData();
        formData.set("id", pageId);
        formData.set("content", content);
        const response = await importWikiPageContent(formData);
        if ("error" in response) {
          toast.error(response.error);
          console.error(response);
          return;
        }
        toast.success(response.success);
        setIsOpen(false);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Exportieren / Importieren"
      >
        <FaFileExport />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Exportieren / Importieren</h2>}
      >
        <p>
          Exportiert den Inhalt der Seite &quot;{title}&quot; als Tiptap-JSON
          (z.B. zum Import in eine andere Seite).
        </p>

        <Button2
          as="a"
          href={`/api/wiki/${pageId}/export`}
          className="mt-4 ml-auto"
        >
          <FaFileExport />
          Exportieren
        </Button2>

        <hr className="my-4 border-white/5" />

        <form onSubmit={handleSubmit}>
          <p>
            Ersetzt den Inhalt der Seite &quot;{title}&quot; vollständig durch
            das hochgeladene Tiptap-JSON (z.B. aus dem JSON-Export einer anderen
            Seite).
          </p>

          <label className="mt-4 block text-white/90" htmlFor={fileInputId}>
            Datei
          </label>
          <input
            id={fileInputId}
            name="file"
            type="file"
            accept=".json,application/json"
            required
            className="mt-2 w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2 file:mr-2 file:cursor-pointer file:rounded-secondary file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-neutral-50"
          />

          <Note
            type="info"
            className="mt-4"
            message="Der aktuelle Stand wird vorher automatisch als Snapshot gesichert."
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaFileImport />}
            Importieren
          </Button2>
        </form>
      </Modal>
    </>
  );
};
