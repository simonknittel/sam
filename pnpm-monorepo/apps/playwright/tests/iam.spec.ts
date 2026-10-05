import { expectAuditEvents } from "../fixtures/audit";
import { assignRole, createCitizen, createRole } from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  FORBIDDEN_TEXT,
  modal,
  NOT_FOUND_TEXT,
  RESOURCE_NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The error of an action whose target a different user deleted */

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
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  // The admin creates a new role through the IAM UI
  await switchUser(admin.user);
  await page.goto("/app/iam/roles");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Rolle" }),
    modal(page, "Neue Rolle"),
  );
  await modal(page, "Neue Rolle").getByLabel("Name").fill("Aufgabenleser");
  await modal(page, "Neue Rolle")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toHaveCount(1);
  await expect(modal(page, "Neue Rolle")).not.toBeVisible();
  await expectAuditEvents(prisma, ["ROLE_CREATED"]);
  /** The next save shows the same text, thus this toast must go first */
  await expect(page.getByText(SAVED_TEXT)).toHaveCount(0);

  // ... and grants it the task-read permission
  await clickUntilUrl(
    page,
    page.getByRole("link", { name: "Aufgabenleser" }),
    /\/app\/roles\/[a-z0-9]+$/,
  );
  await clickUntilUrl(
    page,
    page.getByRole("link", { name: "Berechtigungen" }),
    /\/permissions$/,
  );
  const taskReadLabel = toggleLabel(
    page,
    page.locator('input[name="task;read"]'),
  );
  await clickUntilVisible(
    page.getByRole("tab", { name: "Tasks" }),
    taskReadLabel,
  );
  await taskReadLabel.click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  const role = await prisma.role.findFirst({
    where: { name: "Aufgabenleser" },
    include: { permissionStrings: true },
  });
  expect(
    role?.permissionStrings.map(({ permissionString }) => permissionString),
  ).toContain("task;read");

  // ... and assigns the role to the member on their citizen page
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);
  await clickUntilVisible(
    page.getByRole("button", { name: "Bearbeiten" }),
    modal(page, "Rollen hinzufügen oder entfernen"),
  );
  await modal(page, "Rollen hinzufügen oder entfernen")
    .getByText("Aufgabenleser")
    .click();
  // The role checkboxes save through a debounced form (1s)
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
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

test("a role name that exists already shows the error in the create dialog", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage"],
  });
  await createRole(prisma, { name: "Aufgabenleser" });

  await signIn(admin.user);
  await page.goto("/app/iam/roles");
  const createDialog = modal(page, "Neue Rolle");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Rolle" }),
    createDialog,
  );
  const nameInput = createDialog.getByLabel("Name");
  await nameInput.fill("Aufgabenleser");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  /** The dialog stays open, thus it shows the error itself */
  await expect(
    createDialog.getByText("Eine Rolle mit diesem Namen existiert bereits."),
  ).toBeVisible();
  await expect(nameInput).toHaveValue("Aufgabenleser");
  expect(await prisma.role.count({ where: { name: "Aufgabenleser" } })).toBe(1);
  expect(
    await prisma.auditEvent.count({ where: { type: "ROLE_CREATED" } }),
  ).toBe(0);
});

test("a role ticked right before the role dialog closes is still saved", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: [
      "citizen;read",
      "otherRole;read;roleId=*",
      "otherRole;assign;roleId=*",
    ],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });
  const firstRole = await createRole(prisma, { name: "Erste Rolle" });
  const secondRole = await createRole(prisma, { name: "Zweite Rolle" });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);

  const rolesDialog = modal(page, "Rollen hinzufügen oder entfernen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Bearbeiten" }),
    rolesDialog,
  );

  /**
   * The open dialog hides the page from the accessibility tree, thus the
   * tile behind it is found by its markup.
   */
  const rolesTile = page
    .locator("section")
    .filter({ has: page.locator("h2", { hasText: /^Rollen$/ }) });

  /** A save refreshes the page behind the dialog, and the dialog stays */
  await rolesDialog.getByText("Erste Rolle").click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(rolesTile.getByText("Erste Rolle")).toBeVisible();
  await expect(
    rolesDialog.getByRole("checkbox", { name: "Erste Rolle" }),
  ).toBeChecked();

  /** The dialog closes before the debounced save of the second role */
  await rolesDialog.getByText("Zweite Rolle").click();
  await rolesDialog.getByRole("button", { name: "Schließen" }).click();
  await expect(rolesDialog).not.toBeVisible();

  await expect(rolesTile.getByText("Zweite Rolle")).toBeVisible();
  await expect
    .poll(() =>
      prisma.roleAssignment
        .findMany({
          where: { citizenId: member.entity.id },
          select: { roleId: true },
        })
        .then((assignments) =>
          assignments.map(({ roleId }) => roleId).toSorted(),
        ),
    )
    .toEqual([member.role.id, firstRole.id, secondRole.id].toSorted());
});

test("deleting a role takes its permissions away from its members", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, {
    handle: "task-worker",
    permissionStrings: ["task;read"],
  });

  await signIn(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();

  /** The role the factory gave them is the one carrying `task;read` */
  await switchUser(admin.user);
  await page.goto(`/app/roles/${member.role.id}`);

  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    sectionByHeading(page, "Danger Zone").getByRole("button", {
      name: "Löschen",
    }),
    deleteDialog,
  );
  await expect(page.getByText("Rolle löschen?")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect
    .poll(() => prisma.role.count({ where: { id: member.role.id } }))
    .toBe(0);
  await expect(page).toHaveURL("/app/iam/roles");

  // The back/forward cache must not show the deleted role again
  await page.goBack();
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page).toHaveURL(`/app/roles/${member.role.id}`);

  /** Losing their only role costs them the login permission as well */
  await switchUser(member.user);
  await page.goto("/app/tasks");
  await expect(page).toHaveURL("/clearance");

  await expectAuditEvents(prisma, ["ROLE_DELETED"]);
});

test("an inherited role hands its permissions down to the inheriting one", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });
  const taskRole = await createRole(prisma, {
    name: "Aufgabenleser",
    permissionStrings: ["task;read"],
  });

  await signIn(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  /**
   * The member's own role inherits from the task role instead of the role
   * being assigned to them a second time.
   */
  await switchUser(admin.user);
  await page.goto(`/app/roles/${member.role.id}/inheritance`);
  await toggleLabel(
    page,
    page.locator(`input[value="${taskRole.id}"]`),
  ).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  const inheriting = await prisma.role.findUniqueOrThrow({
    where: { id: member.role.id },
    include: { inherits: { select: { id: true } } },
  });
  expect(inheriting.inherits.map(({ id }) => id)).toEqual([taskRole.id]);

  await switchUser(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();

  await expectAuditEvents(prisma, ["ROLE_INHERITANCE_UPDATED"]);
});

test("the permission matrix grants and revokes a permission with a single checkbox", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });

  await signIn(admin.user);
  await page.goto("/app/iam/permission-matrix");
  await waitForAppShellHydration(page);

  /**
   * The matrix has no visible labels — its checkboxes carry the role and
   * the permission in the name the form submits.
   */
  const taskReadCheckbox = page.locator(
    `input[name="${member.role.id}_task;read"]`,
  );
  await toggleLabel(page, taskReadCheckbox).click();
  await expect(taskReadCheckbox).toBeChecked();

  const countTaskReadPermissions = () =>
    prisma.permissionString.count({
      where: { roleId: member.role.id, permissionString: "task;read" },
    });
  await expect.poll(countTaskReadPermissions).toBe(1);

  await switchUser(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();

  await switchUser(admin.user);
  await page.goto("/app/iam/permission-matrix");
  await waitForAppShellHydration(page);
  await expect(taskReadCheckbox).toBeChecked();
  await toggleLabel(page, taskReadCheckbox).click();
  await expect(taskReadCheckbox).not.toBeChecked();
  await expect.poll(countTaskReadPermissions).toBe(0);

  await switchUser(member.user);
  await page.goto("/app/tasks");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});

test("two tabs that grant the same permission create one row", async ({
  context,
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });

  await signIn(admin.user);
  const secondPage = await context.newPage();
  for (const tab of [page, secondPage]) {
    await tab.goto("/app/iam/permission-matrix");
    await waitForAppShellHydration(tab);
  }

  /** Both tabs still show the permission as not granted */
  for (const tab of [page, secondPage]) {
    const checkbox = tab.locator(`input[name="${member.role.id}_task;read"]`);
    await toggleLabel(tab, checkbox).click();
    await expect(checkbox).toBeChecked();
  }

  await expect
    .poll(() =>
      prisma.auditEvent.count({
        where: { type: "ROLE_PERMISSION_TOGGLED" },
      }),
    )
    .toBe(2);
  expect(
    await prisma.permissionString.count({
      where: { roleId: member.role.id, permissionString: "task;read" },
    }),
  ).toBe(1);
});

test("the inheritance matrix wires two roles together with a single checkbox", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });
  const taskRole = await createRole(prisma, {
    name: "Aufgabenleser",
    permissionStrings: ["task;read"],
  });

  await signIn(admin.user);
  await page.goto("/app/iam/inheritance-matrix");
  await waitForAppShellHydration(page);

  /**
   * The matrix has no visible labels — its checkboxes carry the inheriting
   * and the inherited role in the name the form submits.
   */
  const cell = page.locator(`input[name="${member.role.id}_${taskRole.id}"]`);
  await toggleLabel(page, cell).click();
  await expect(cell).toBeChecked();

  const inheritedRoleIds = () =>
    prisma.role
      .findUniqueOrThrow({
        where: { id: member.role.id },
        select: { inherits: { select: { id: true } } },
      })
      .then(({ inherits }) => inherits.map(({ id }) => id));

  await expect.poll(inheritedRoleIds).toEqual([taskRole.id]);

  /** The per-role tab is the second edit surface and must agree */
  await page.goto(`/app/roles/${member.role.id}/inheritance`);
  await expect(page.locator(`input[value="${taskRole.id}"]`)).toBeChecked();

  /** Unchecking the same cell takes the inheritance away again */
  await page.goto("/app/iam/inheritance-matrix");
  await waitForAppShellHydration(page);
  await toggleLabel(page, cell).click();
  await expect(cell).not.toBeChecked();
  await expect.poll(inheritedRoleIds).toEqual([]);

  /** A role cannot inherit itself, thus the diagonal carries no control */
  await expect(
    page.locator(`input[name="${member.role.id}_${member.role.id}"]`),
  ).toHaveCount(0);

  await expectAuditEvents(prisma, ["ROLE_INHERITANCE_TOGGLED"]);
});

test("saving the permissions of a role that a different user deleted shows the error and the current page", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const role = await createRole(prisma, { name: "Kurzlebige Rolle" });

  await signIn(admin.user);
  await page.goto(`/app/roles/${role.id}/permissions`);
  await waitForAppShellHydration(page);
  const saveButton = page.getByRole("button", { name: "Speichern" });
  await expect(saveButton).toBeVisible();

  /** A different user deletes the role after the page loaded */
  await prisma.role.delete({ where: { id: role.id } });

  /** The refresh removes the form, thus the error shows as a toast */
  await saveButton.click();
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page).toHaveURL(`/app/roles/${role.id}/permissions`);

  expect(
    await prisma.auditEvent.count({
      where: { type: "ROLE_PERMISSIONS_UPDATED" },
    }),
  ).toBe(0);
});

test("an inheritance of a role that a different user deleted shows the error and the current matrix", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });
  const member = await createCitizen(prisma, { handle: "task-worker" });
  const deletedRole = await createRole(prisma, { name: "Kurzlebige Rolle" });

  await signIn(admin.user);
  await page.goto("/app/iam/inheritance-matrix");
  await waitForAppShellHydration(page);
  const cell = page.locator(
    `input[name="${member.role.id}_${deletedRole.id}"]`,
  );
  await expect(cell).toHaveCount(1);

  /** A different user deletes the inherited role after the page loaded */
  await prisma.role.delete({ where: { id: deletedRole.id } });

  await toggleLabel(page, cell).click();
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(cell).toHaveCount(0);
  await expect(page.getByText("Kurzlebige Rolle")).toHaveCount(0);

  expect(
    await prisma.auditEvent.count({
      where: { type: "ROLE_INHERITANCE_TOGGLED" },
    }),
  ).toBe(0);
});

test("removing a role that a different user removed shows the error and the current roles", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "rollen-admin",
    permissionStrings: [
      "citizen;read",
      "otherRole;read;roleId=*",
      "otherRole;dismiss;roleId=*",
    ],
  });
  const member = await createCitizen(prisma, { handle: "rollen-mitglied" });
  const role = await createRole(prisma, { name: "Testrolle" });
  await assignRole(prisma, member.entity, role);

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);
  await waitForAppShellHydration(page);

  const badge = page.getByRole("button").filter({ hasText: "Testrolle" });
  const popover = page.getByRole("dialog", { name: "Rollendetails" });
  await clickUntilVisible(badge, popover);

  /** A different user removes the role after the page loaded */
  await prisma.roleAssignment.delete({
    where: {
      citizenId_roleId: { citizenId: member.entity.id, roleId: role.id },
    },
  });

  const dialog = page.getByRole("alertdialog", { name: "Rolle entfernen?" });
  await popover.getByRole("button", { name: "Entfernen" }).click();
  await dialog.getByRole("button", { name: "Entfernen" }).click();

  /** The refresh removes the badge, thus the error shows as a toast */
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(badge).toHaveCount(0);

  /** The history gets no record of a removal that did not happen */
  expect(
    await prisma.roleAssignmentChange.count({
      where: { citizenId: member.entity.id, roleId: role.id },
    }),
  ).toBe(0);
  expect(
    await prisma.auditEvent.count({
      where: { type: "ROLE_ASSIGNMENT_DELETED" },
    }),
  ).toBe(0);
});
