import type { Locator, Page } from "@playwright/test";
import type { PrismaClient, User } from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  createRole,
  futureEvent,
} from "../fixtures/factories";
import { hoverUntilVisible, modal } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The role dialog opens from the citizen popover, and the popover opens on
 * hover. The dialog is in a portal outside of the popover, thus the pointer
 * on the dialog is outside of the popover. The dialog must hold the popover
 * open: a close of the popover also removes the dialog.
 */

const FIRST_ROLE = "Erste Rolle";
const SECOND_ROLE = "Zweite Rolle";

/** The number of pointer moves from the start point to the target */
const POINTER_STEPS = 10;

/**
 * Moves the pointer in steps to the middle of the target, as a hand does,
 * and clicks there.
 */
const clickWithPointerSteps = async (target: Locator) => {
  const box = await target.boundingBox();
  if (!box) throw new Error("The target has no bounding box");

  const mouse = target.page().mouse;
  await mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: POINTER_STEPS,
  });
  await mouse.down();
  await mouse.up();
};

/**
 * A viewer who may assign each role opens the popover of the citizen who
 * created the event.
 */
const openCitizenPopover = async (
  page: Page,
  prisma: PrismaClient,
  signIn: (user: Pick<User, "id">) => Promise<void>,
) => {
  const owner = await createCitizen(prisma, { handle: "rollen-ziel" });
  const viewer = await createCitizen(prisma, {
    handle: "rollen-pfleger",
    permissionStrings: [
      "event;read",
      "citizen;read",
      "otherRole;read;roleId=*",
      "otherRole;assign;roleId=*",
    ],
  });
  const firstRole = await createRole(prisma, { name: FIRST_ROLE });
  const secondRole = await createRole(prisma, { name: SECOND_ROLE });
  const event = await createAppEvent(prisma, {
    name: "Operation Rollenpflege",
    createdById: owner.entity.id,
    ...futureEvent(),
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);

  /**
   * The open dialog hides the popover from the accessibility tree. Thus the
   * locator also finds a hidden popover, and a popover that stays open after
   * the dialog closed does not escape the check.
   */
  const popover = page.getByRole("dialog", {
    name: "Citizen-Details",
    includeHidden: true,
  });
  await hoverUntilVisible(
    page.getByRole("link", { name: owner.entity.handle! }).first(),
    popover,
  );

  const savedRoleIds = () =>
    prisma.roleAssignment
      .findMany({
        where: { citizenId: owner.entity.id },
        select: { roleId: true },
      })
      .then((assignments) =>
        assignments.map(({ roleId }) => roleId).toSorted(),
      );

  return {
    popover,
    editButton: popover.getByRole("button", { name: "Bearbeiten" }),
    rolesDialog: modal(page, "Rollen hinzufügen oder entfernen"),
    savedRoleIds,
    ownRoleId: owner.role.id,
    firstRoleId: firstRole.id,
    secondRoleId: secondRole.id,
  };
};

enum Interaction {
  Click = "clicks",
  Keyboard = "the keyboard",
  PointerSteps = "a pointer that moves in steps",
}

interface InteractionScenario {
  readonly interaction: Interaction;
  readonly openDialog: (editButton: Locator) => Promise<void>;
  readonly tickRole: (rolesDialog: Locator, roleName: string) => Promise<void>;
  readonly closeDialog: (rolesDialog: Locator) => Promise<void>;
}

const closeButton = (rolesDialog: Locator) =>
  rolesDialog.getByRole("button", { name: "Schließen" });

const SCENARIOS: readonly InteractionScenario[] = [
  {
    interaction: Interaction.Click,
    openDialog: (editButton) => editButton.click(),
    tickRole: (rolesDialog, roleName) =>
      rolesDialog.getByText(roleName).click(),
    closeDialog: (rolesDialog) => closeButton(rolesDialog).click(),
  },
  {
    /** The pointer stays where the hover opened the popover */
    interaction: Interaction.Keyboard,
    openDialog: async (editButton) => {
      await editButton.focus();
      await editButton.page().keyboard.press("Enter");
    },
    tickRole: (rolesDialog, roleName) =>
      rolesDialog.getByRole("checkbox", { name: roleName }).press("Space"),
    closeDialog: (rolesDialog) => rolesDialog.page().keyboard.press("Escape"),
  },
  {
    interaction: Interaction.PointerSteps,
    openDialog: clickWithPointerSteps,
    tickRole: (rolesDialog, roleName) =>
      clickWithPointerSteps(rolesDialog.getByText(roleName)),
    closeDialog: (rolesDialog) =>
      clickWithPointerSteps(closeButton(rolesDialog)),
  },
];

for (const scenario of SCENARIOS) {
  test(`the role dialog of the citizen popover stays open for two roles, with ${scenario.interaction}`, async ({
    page,
    prisma,
    signIn,
  }) => {
    const {
      popover,
      editButton,
      rolesDialog,
      savedRoleIds,
      ownRoleId,
      firstRoleId,
      secondRoleId,
    } = await openCitizenPopover(page, prisma, signIn);

    await scenario.openDialog(editButton);
    /** The roles load only after the dialog opened */
    await expect(rolesDialog.getByText(FIRST_ROLE)).toBeVisible();

    await scenario.tickRole(rolesDialog, FIRST_ROLE);
    await expect
      .poll(savedRoleIds)
      .toEqual([ownRoleId, firstRoleId].toSorted());
    await expect(rolesDialog).toBeVisible();
    await expect(
      rolesDialog.getByRole("checkbox", { name: FIRST_ROLE }),
    ).toBeChecked();

    await scenario.tickRole(rolesDialog, SECOND_ROLE);
    await expect
      .poll(savedRoleIds)
      .toEqual([ownRoleId, firstRoleId, secondRoleId].toSorted());
    await expect(rolesDialog).toBeVisible();

    await scenario.closeDialog(rolesDialog);
    await expect(rolesDialog).not.toBeVisible();
    /** The popover closes together with the dialog */
    await expect(popover).not.toBeVisible();
  });
}

test("a role ticked right before the role dialog of the citizen popover closes is still saved", async ({
  page,
  prisma,
  signIn,
}) => {
  const {
    popover,
    editButton,
    rolesDialog,
    savedRoleIds,
    ownRoleId,
    firstRoleId,
  } = await openCitizenPopover(page, prisma, signIn);

  await editButton.click();
  await expect(rolesDialog.getByText(FIRST_ROLE)).toBeVisible();

  /** The dialog closes before the debounced save of the role */
  await rolesDialog.getByText(FIRST_ROLE).click();
  await closeButton(rolesDialog).click();
  await expect(rolesDialog).not.toBeVisible();
  await expect(popover).not.toBeVisible();

  await expect.poll(savedRoleIds).toEqual([ownRoleId, firstRoleId].toSorted());
});
