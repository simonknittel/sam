import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  clickUntilUrl,
  dateParam,
  fillUntilUrl,
  fillUntilVisible,
  toggleLabel,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * That an action's audit event ends up rendered here is asserted where the
 * action lives (see the spynet settings and SILC specs). This spec owns the
 * table itself, so it seeds its rows instead of driving a foreign UI.
 */
test("the log renders its events and the filters narrow the table", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "protokollant",
    permissionStrings: ["systemLog;read"],
  });
  const otherUser = await createCitizen(prisma, { handle: "zweitnutzer" });
  const role = await createCitizen(prisma, { handle: "rollen-halter" });

  await prisma.auditEvent.createMany({
    data: [
      /** Some stored events hold their data as a JSON string. */
      {
        type: "MANUFACTURER_CREATED",
        data: JSON.stringify({
          manufacturerId: "hersteller-1",
          name: "Drake",
        }),
        createdById: otherUser.user.id,
        createdAt: new Date(Date.now() - 10 * ONE_DAY_MS),
      },
      {
        type: "ROLE_CREATED",
        data: { roleId: role.role.id, name: "Aufklärer" },
        createdById: admin.user.id,
      },
      {
        type: "TASK_CREATED",
        data: {
          taskIds: ["aufgabe-1"],
          visibility: "PUBLIC",
          rewardType: "TEXT",
        },
        createdById: admin.user.id,
        triggeredViaMcp: true,
      },
      {
        type: "TASK_READ",
        data: { arguments: { task_id: "aufgabe-1" } },
        createdById: admin.user.id,
        triggeredViaMcp: true,
      },
    ],
  });

  const rowOfType = (type: string) =>
    page.getByRole("row").filter({ hasText: type });

  await signIn(admin.user);
  await page.goto("/app/system-log");

  await expect(page.getByText('Role created: "Aufklärer"')).toBeVisible();
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible();
  await expect(page.getByText("MANUFACTURER_CREATED")).toBeVisible();
  await expect(rowOfType("TASK_READ")).toHaveCount(0);

  const mcpMark = (type: string) =>
    rowOfType(type).getByRole("cell", { name: "Ja", exact: true });
  await expect(mcpMark("TASK_CREATED")).toHaveCount(1);
  await expect(mcpMark("ROLE_CREATED")).toHaveCount(0);
  await expect(mcpMark("MANUFACTURER_CREATED")).toHaveCount(0);

  const fromDate = dateParam(new Date(Date.now() - 5 * ONE_DAY_MS));
  await fillUntilUrl(
    page,
    page.getByLabel("Von"),
    fromDate,
    new RegExp(`from=${fromDate}`),
  );
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).not.toBeVisible();
  await expect(page.getByText('Role created: "Aufklärer"')).toBeVisible();

  await page.goto("/app/system-log?type=MANUFACTURER_CREATED");
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible();
  await expect(page.getByText('Role created: "Aufklärer"')).toHaveCount(0);

  // Each view writes a read with its filters, but not with the result. The
  // page writes it after its response.
  await expect
    .poll(() =>
      prisma.auditEvent.findMany({
        where: { type: "AUDIT_EVENTS_LISTED", createdById: admin.user.id },
        select: { triggeredViaMcp: true, data: true },
      }),
    )
    .toContainEqual({
      triggeredViaMcp: false,
      data: {
        arguments: {
          types: ["MANUFACTURER_CREATED"],
          include_high_volume: false,
          access: "write",
          limit: 50,
        },
      },
    });

  await page.goto(`/app/system-log?createdById=${otherUser.user.id}`);
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible();
  await expect(page.getByText('Role created: "Aufklärer"')).toHaveCount(0);

  await page.goto("/app/system-log?origin=mcp");
  await expect(rowOfType("TASK_CREATED")).toBeVisible();
  await expect(rowOfType("ROLE_CREATED")).toHaveCount(0);
  await expect(rowOfType("MANUFACTURER_CREATED")).toHaveCount(0);

  await page.goto("/app/system-log");
  await clickUntilUrl(
    page,
    toggleLabel(page.getByRole("radiogroup", { name: "QUELLE" }), /^MCP$/),
    /origin=mcp/,
  );
  await expect(rowOfType("TASK_CREATED")).toBeVisible();
  await expect(rowOfType("ROLE_CREATED")).toHaveCount(0);

  await page.goto(`/app/system-log?createdById=${admin.user.id}`);
  await clickUntilUrl(
    page,
    toggleLabel(page.getByRole("radiogroup", { name: "ZUGRIFF" }), /^Lesen$/),
    /access=read/,
  );
  await expect(
    page.getByText('Task read: {"task_id":"aufgabe-1"}'),
  ).toBeVisible();
  await expect(rowOfType("TASK_CREATED")).toHaveCount(0);
  await expect(rowOfType("ROLE_CREATED")).toHaveCount(0);

  await page.goto(`/app/system-log?createdById=${admin.user.id}`);
  const typeOption = page
    .getByRole("group", { name: "Tasks" })
    .getByRole("option", { name: "TASK_READ", exact: true });
  await fillUntilVisible(
    page.getByRole("combobox", { name: "TYPE" }),
    "TASK_READ",
    typeOption,
  );
  await expect(page.getByRole("listbox").getByRole("option")).toHaveText([
    "TASK_READ",
  ]);
  // The visible option proves the hydration, and a second click would remove
  // the type again, thus a single click
  await typeOption.click();
  await expect(page).toHaveURL(/type=TASK_READ/);
  await expect(
    page.getByText('Task read: {"task_id":"aufgabe-1"}'),
  ).toBeVisible();
  await expect(rowOfType("TASK_CREATED")).toHaveCount(0);
});
