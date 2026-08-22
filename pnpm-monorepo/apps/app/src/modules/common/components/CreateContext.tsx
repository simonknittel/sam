"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Modal from "@/modules/common/components/Modal";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const CreateCitizenForm = dynamic(() =>
  import("@/modules/citizen/components/CreateCitizen/CreateCitizenForm").then(
    (mod) => mod.CreateCitizenForm,
  ),
);

const CreateOrganizationForm = dynamic(() =>
  import("@/modules/spynet/components/CreateOrganization/CreateOrganizationForm").then(
    (mod) => mod.CreateOrganizationForm,
  ),
);

const CreateRoleForm = dynamic(() =>
  import("@/modules/roles/components/CreateRole/CreateRoleForm").then(
    (mod) => mod.CreateRoleForm,
  ),
);

const CreatePenaltyEntryForm = dynamic(() =>
  import("@/modules/penalty-points/components/CreatePenaltyEntry/CreatePenaltyEntryForm").then(
    (mod) => mod.CreatePenaltyEntryForm,
  ),
);

const CreateTaskForm = dynamic(() =>
  import("@/modules/tasks/components/CreateTask/CreateTaskForm").then(
    (mod) => mod.CreateTaskForm,
  ),
);

const CreateEventForm = dynamic(() =>
  import("@/modules/events/components/CreateEvent/CreateEventForm").then(
    (mod) => mod.CreateEventForm,
  ),
);

const CreateProfitDistributionCycleForm = dynamic(() =>
  import("@/modules/profit-distribution/components/CreateProfitDistributionCycleForm").then(
    (mod) => mod.CreateProfitDistributionCycleForm,
  ),
);

const CreateSilcTransactionForm = dynamic(() =>
  import("@/modules/silc/components/CreateSilcTransactionForm").then(
    (mod) => mod.CreateSilcTransactionForm,
  ),
);

const CreateWikiPageGlobalForm = dynamic(() =>
  import("@/modules/wiki/components/CreateWikiPageGlobalForm").then(
    (mod) => mod.CreateWikiPageGlobalForm,
  ),
);

const CreateFlowForm = dynamic(() =>
  import("@/modules/career/components/CreateFlowForm").then(
    (mod) => mod.CreateFlowForm,
  ),
);

const CreateEventTemplateForm = dynamic(() =>
  import("@/modules/event-templates/components/CreateEventTemplateForm").then(
    (mod) => mod.CreateEventTemplateForm,
  ),
);

export const createForms = {
  citizen: {
    formComponent: CreateCitizenForm,
    modalHeading: "Neuer Citizen",
    modalWidth: "w-120",
  },
  profitDistributionCycle: {
    formComponent: CreateProfitDistributionCycleForm,
    modalHeading: "Neuer SINcome-Zeitraum",
    modalWidth: "w-120",
  },
  organization: {
    formComponent: CreateOrganizationForm,
    modalHeading: "Neue Organisation",
    modalWidth: "w-120",
  },
  role: {
    formComponent: CreateRoleForm,
    modalHeading: "Neue Rolle",
    modalWidth: "w-120",
  },
  penaltyEntry: {
    formComponent: CreatePenaltyEntryForm,
    modalHeading: "Neue Strafpunkte",
    modalWidth: "w-120",
  },
  task: {
    formComponent: CreateTaskForm,
    modalHeading: "Neuer Task",
    modalWidth: "w-3xl",
  },
  event: {
    formComponent: CreateEventForm,
    modalHeading: "Neues Event",
    modalWidth: "w-120",
  },
  silcTransaction: {
    formComponent: CreateSilcTransactionForm,
    modalHeading: "Neue SILC-Transaktion",
    modalWidth: "w-120",
  },
  wikiPage: {
    formComponent: CreateWikiPageGlobalForm,
    modalHeading: "Neue Seite",
    modalWidth: "w-120",
  },
  flow: {
    formComponent: CreateFlowForm,
    modalHeading: "Neuer Karrierebaum",
    modalWidth: "w-120",
  },
  eventTemplate: {
    formComponent: CreateEventTemplateForm,
    modalHeading: "Neue Event-Vorlage",
    modalWidth: "w-120",
  },
};

/**
 * Per-open input for the form behind a modal id, e.g. the template a
 * create-event modal starts from. Every form ignores what it does not
 * declare, so the payload stays a plain optional prop bag.
 */
export interface CreateFormPayload {
  readonly templateId?: string;
}

interface CreateContext {
  readonly openCreateModal: (
    modalId: keyof typeof createForms,
    payload?: CreateFormPayload,
  ) => void;
}

const CreateContext = createContext<CreateContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
}

export const CreateContextProvider = ({ children }: Props) => {
  const [currentlyOpenForm, setCurrentlyOpenForm] = useState<{
    readonly modalId: keyof typeof createForms;
    readonly payload?: CreateFormPayload;
  } | null>(null);

  const openCreateModal = useCallback(
    (modalId: keyof typeof createForms, payload?: CreateFormPayload) =>
      setCurrentlyOpenForm({ modalId, payload }),
    [],
  );

  const value = useMemo(
    () => ({
      openCreateModal,
    }),
    [openCreateModal],
  );

  return (
    <CreateContext.Provider value={value}>
      {children}

      {currentlyOpenForm && createForms[currentlyOpenForm.modalId] && (
        <ModalWithFormComponent
          form={createForms[currentlyOpenForm.modalId]}
          payload={currentlyOpenForm.payload}
          onRequestClose={() => setCurrentlyOpenForm(null)}
        />
      )}
    </CreateContext.Provider>
  );
};

interface ModalWithFormComponentProps {
  readonly form: (typeof createForms)[keyof typeof createForms];
  readonly payload?: CreateFormPayload;
  readonly onRequestClose: () => void;
}

const ModalWithFormComponent = ({
  form,
  payload,
  onRequestClose,
}: ModalWithFormComponentProps) => {
  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className={form.modalWidth}
      heading={<h2>{form.modalHeading}</h2>}
    >
      <Suspense
        fallback={
          <div className="flex justify-center items-center p-8">
            <AsciiSpinner className="text-5xl text-neutral-500" />
          </div>
        }
      >
        <form.formComponent {...payload} onSuccess={onRequestClose} />
      </Suspense>
    </Modal>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useCreateContext() {
  const context = useContext(CreateContext);
  if (!context) throw new Error("[CreateContext] Provider is missing!");
  return context;
}
