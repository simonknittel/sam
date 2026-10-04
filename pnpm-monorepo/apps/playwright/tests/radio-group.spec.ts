import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  createRole,
  createWikiPage,
  EventVisibility,
  futureEvent,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  modal,
  SAVED_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The radio group (`RadioGroup`) is a group of native radio inputs. These
 * tests examine the group itself; the specs of the features examine what
 * their choices do.
 */

test("the keyboard moves the selection of a radio group, and the form submits it", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "radio-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Radioseite",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  const dialog = modal(page, "Sichtbarkeit in der Seitenleiste");
  await clickUntilVisible(
    page.getByRole("button", { name: "Sichtbarkeit in der Seitenleiste" }),
    dialog,
  );
  const group = dialog.getByRole("radiogroup", {
    name: "Sichtbarkeit in der Seitenleiste",
  });
  const visible = group.getByRole("radio", { name: "Sichtbar", exact: true });
  const hidden = group.getByRole("radio", {
    name: "Ausgeblendet",
    exact: true,
  });
  const saveButton = dialog.getByRole("button", { name: "Speichern" });

  /** The group is one stop of the tab order, on the checked radio */
  await dialog.getByRole("button", { name: "Schließen" }).focus();
  await page.keyboard.press("Tab");
  await expect(visible).toBeFocused();
  await expect(visible).toBeChecked();

  await page.keyboard.press("ArrowRight");
  await expect(hidden).toBeFocused();
  await expect(hidden).toBeChecked();
  await expect(visible).not.toBeChecked();

  await page.keyboard.press("Tab");
  await expect(saveButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(hidden).toBeFocused();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(async () => {
      const { sidebarMode } = await prisma.wikiPage.findUniqueOrThrow({
        where: { id: wikiPage.id },
      });
      return sidebarMode;
    })
    .toBe(WikiPageSidebarMode.HIDDEN);
});

test("a radio group keeps its selection after the action of its form", async ({
  page,
  prisma,
  signIn,
}) => {
  const role = await createRole(prisma, { name: "eingeweihte" });
  const creator = await createCitizen(prisma, {
    handle: "radio-orga",
    permissionStrings: ["event;read", "otherRole;read;roleId=*"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Auswahl",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  const restricted = page.getByRole("radio", { name: "Eingeschränkt" });
  const saveButton = page.getByRole("button", { name: "Speichern" });
  await toggleLabel(page, /^Eingeschränkt$/).click();
  const rolePicker = page.getByRole("dialog", { name: "Rolle auswählen" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Rolle hinzufügen" }),
    rolePicker,
  );
  await rolePicker.getByText(role.name).click();
  await saveButton.click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  /**
   * The toast shows before the action ends. At the end, React enables the
   * button again and resets the form, and the choice must stay.
   */
  await expect(saveButton).toBeEnabled();
  await expect(restricted).toBeChecked();
  await expect
    .poll(async () => {
      const { visibility } = await prisma.event.findUniqueOrThrow({
        where: { id: event.id },
      });
      return visibility;
    })
    .toBe(EventVisibility.RESTRICTED);

  await page.getByLabel("Titel").fill("Operation Auswahl II");
  await saveButton.click();
  await expect
    .poll(() => prisma.event.findUniqueOrThrow({ where: { id: event.id } }))
    .toMatchObject({
      name: "Operation Auswahl II",
      visibility: EventVisibility.RESTRICTED,
    });
  await expect(restricted).toBeChecked();
});
