import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  FORBIDDEN_TEXT,
  modal,
  SAVED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a role created and assigned through the UI grants its permission", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: [
      "role;manage",
      "citizen;read",
      "otherRole;read;roleId=*",
      "otherRole;assign;roleId=*",
    ],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });

  // Without the permission the tasks page is off limits for the member
  await signIn(member.user);
  await page.goto("/app/tasks");
  // Often the worker's first page load — warm-up can exceed the default 5s
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // The admin creates a new role through the IAM UI
  await switchUser(admin.user);
  await page.goto("/app/iam/roles");
  await page.getByRole("button", { name: "Neue Rolle" }).click();
  await modal(page, "Neue Rolle").getByLabel("Name").fill("Aufgabenleser");
  await modal(page, "Neue Rolle")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText("Erfolgreich hinzugefügt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // ... and grants it the task-read permission
  await page.getByRole("link", { name: "Aufgabenleser" }).click();
  await page.getByRole("link", { name: "Berechtigungen" }).click();
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .locator("label")
    .filter({ has: page.locator('input[name="task;read"]') })
    .click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const role = await prisma.role.findFirst({
    where: { name: "Aufgabenleser" },
    include: { permissionStrings: true },
  });
  expect(
    role?.permissionStrings.map(({ permissionString }) => permissionString),
  ).toContain("task;read");

  // ... and assigns the role to the member on their citizen page
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  await modal(page, "Rollen hinzufügen oder entfernen")
    .getByText("Aufgabenleser")
    .click();
  // The role checkboxes save through a debounced form (1s)
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await page.getByRole("button", { name: "Schließen" }).click();
  await expect(
    modal(page, "Rollen hinzufügen oder entfernen"),
  ).not.toBeVisible();
  // Badge in the roles tile plus the new entry in the roles history
  await expect(page.getByText("Aufgabenleser").first()).toBeVisible();

  // With the assigned role the member passes the permission gate
  await switchUser(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();
  await expect(page.getByText(FORBIDDEN_TEXT)).not.toBeVisible();
});
