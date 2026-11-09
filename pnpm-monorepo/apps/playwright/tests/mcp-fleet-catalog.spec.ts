import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createMcpCitizen,
  createRole,
  createVariant,
  createWikiPage,
  WikiPageAccessType,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

const CATALOG_MANAGER_PERMISSIONS = ["manufacturersSeriesAndVariants;manage"];

const RSI_LINK = {
  service: "RSI",
  url: "https://robertsspaceindustries.com/pledge/ships/drake-cutlass/Cutlass-Black",
};

test.describe("the ship catalog tools of the MCP server", () => {
  test("a catalog manager creates, changes and deletes a manufacturer, a series and a variant, and the deletes take the ships with them", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-katalog-verwalterin",
      permissionStrings: CATALOG_MANAGER_PERMISSIONS,
    });
    const owner = await createCitizen(prisma, { handle: "mcp-cutlass-pilot" });
    const client = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );

    const manufacturer = await callForContent(
      client,
      "create_ship_manufacturer",
      { name: "Drake Interplanetary" },
    );
    const series = await callForContent(client, "create_ship_series", {
      manufacturer_id: manufacturer.id,
      name: "Cutlass",
    });
    expect(series).toEqual({
      id: expect.any(String),
      name: "Cutlass",
      manufacturer_id: manufacturer.id,
    });

    expect(await callForContent(client, "list_ship_manufacturers")).toEqual({
      manufacturers: [
        {
          id: manufacturer.id,
          name: "Drake Interplanetary",
          logo: null,
          series: [{ id: series.id, name: "Cutlass" }],
        },
      ],
      next_cursor: null,
    });

    // The same tag two times is one tag
    const variant = await callForContent(client, "create_ship_variant", {
      series_id: series.id,
      name: "Cutlass Black",
      status: "flight_ready",
      tags: [
        { key: "Rolle", value: "Frachter" },
        { key: "Rolle", value: "Frachter" },
      ],
      links: [RSI_LINK],
    });
    expect(variant).toMatchObject({
      name: "Cutlass Black",
      status: "flight_ready",
      series: { id: series.id, name: "Cutlass" },
      manufacturer: { id: manufacturer.id, name: "Drake Interplanetary" },
      tags: [{ key: "Rolle", value: "Frachter" }],
      links: [RSI_LINK],
      wiki_page_id: null,
      ship_count: 0,
    });

    // The tags and the links that the update does not give stay
    expect(
      await callForContent(client, "update_ship_variant", {
        variant_id: variant.id,
        name: "Cutlass Red",
        status: "not_flight_ready",
      }),
    ).toMatchObject({
      name: "Cutlass Red",
      status: "not_flight_ready",
      tags: [{ key: "Rolle", value: "Frachter" }],
      links: [RSI_LINK],
    });
    // The tags of an output, with their ids, are an input
    expect(
      await callForContent(client, "update_ship_variant", {
        variant_id: variant.id,
        tags: [
          ...(variant.tags as object[]),
          { key: "Größe", value: "Mittel" },
        ],
      }),
    ).toMatchObject({
      tags: [
        { key: "Größe", value: "Mittel" },
        { key: "Rolle", value: "Frachter" },
      ],
      links: [RSI_LINK],
    });
    expect(
      await callForContent(client, "update_ship_variant", {
        variant_id: variant.id,
        tags: [],
        links: [],
      }),
    ).toMatchObject({ name: "Cutlass Red", tags: [], links: [] });

    await callForContent(client, "update_ship_manufacturer", {
      manufacturer_id: manufacturer.id,
      name: "Drake",
    });
    await callForContent(client, "update_ship_series", {
      series_id: series.id,
      name: "Cutlass-Serie",
    });

    await prisma.ship.create({
      data: { ownerId: owner.entity.id, variantId: String(variant.id) },
    });
    expect(
      await callForContent(client, "get_ship_variant", {
        variant_id: variant.id,
      }),
    ).toMatchObject({
      name: "Cutlass Red",
      series: { name: "Cutlass-Serie" },
      manufacturer: { name: "Drake" },
      ship_count: 1,
    });

    expect(
      await callForContent(client, "delete_ship_variant", {
        variant_id: variant.id,
      }),
    ).toMatchObject({
      id: variant.id,
      name: "Cutlass Red",
      series: { id: series.id },
      ship_count: 1,
    });
    expect(await prisma.ship.count()).toBe(0);

    // The series and the manufacturer cascade to their variants and ships
    const { variant: secondVariant } = await createVariant(prisma, {
      manufacturerName: "Aegis Dynamics",
      seriesName: "Avenger",
      variantName: "Avenger Titan",
    });
    await prisma.ship.create({
      data: { ownerId: owner.entity.id, variantId: secondVariant.id },
    });
    expect(
      await callForContent(client, "delete_ship_series", {
        series_id: secondVariant.seriesId,
      }),
    ).toMatchObject({ name: "Avenger" });
    expect(await prisma.ship.count()).toBe(0);

    expect(
      await callForContent(client, "delete_ship_manufacturer", {
        manufacturer_id: manufacturer.id,
      }),
    ).toEqual({ id: manufacturer.id, name: "Drake" });
    expect(await prisma.series.findMany({ select: { name: true } })).toEqual(
      [],
    );

    await expectAuditEvents(prisma, [
      "MANUFACTURER_CREATED",
      "MANUFACTURER_UPDATED",
      "MANUFACTURER_DELETED",
      "SERIES_CREATED",
      "SERIES_UPDATED",
      "SERIES_DELETED",
      "VARIANT_CREATED_V3",
      "VARIANT_UPDATED_V3",
      "VARIANT_DELETED",
      "SHIP_MANUFACTURERS_LISTED",
      "SHIP_VARIANT_READ",
    ]);
    // The first update keeps the links, the last one removes them
    const rsiAuditLinks = [{ serviceName: "RSI", url: RSI_LINK.url }];
    expect(
      await prisma.auditEvent.findMany({
        where: { type: "VARIANT_UPDATED_V3" },
        orderBy: { createdAt: "asc" },
        select: { createdById: true, data: true },
      }),
    ).toEqual([
      {
        createdById: manager.user.id,
        data: expect.objectContaining({
          previousName: "Cutlass Black",
          newName: "Cutlass Red",
          previousStatus: "FLIGHT_READY",
          newStatus: "NOT_FLIGHT_READY",
          previousLinks: rsiAuditLinks,
          newLinks: rsiAuditLinks,
        }),
      },
      {
        createdById: manager.user.id,
        data: expect.objectContaining({
          previousLinks: rsiAuditLinks,
          newLinks: rsiAuditLinks,
        }),
      },
      {
        createdById: manager.user.id,
        data: expect.objectContaining({
          previousLinks: rsiAuditLinks,
          newLinks: [],
        }),
      },
    ]);
  });

  test("the catalog names stay unique, a variant has one link for each service and only a readable wiki page, and only a catalog manager gets the write tools", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-katalog-verwalter",
      permissionStrings: CATALOG_MANAGER_PERMISSIONS,
    });
    const pilot = await createMcpCitizen(prisma, {
      handle: "mcp-pilot",
      permissionStrings: ["ship;read"],
    });
    const { manufacturer, series, variant } = await createVariant(prisma, {
      manufacturerName: "Drake Interplanetary",
      seriesName: "Cutlass",
      variantName: "Cutlass Black",
    });
    const { manufacturer: otherManufacturer, series: otherSeries } =
      await createVariant(prisma, {
        manufacturerName: "Aegis Dynamics",
        seriesName: "Avenger",
        variantName: "Avenger Titan",
      });
    const managerClient = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );

    expect(
      await callForError(managerClient, "update_ship_manufacturer", {
        manufacturer_id: otherManufacturer.id,
        name: "Drake Interplanetary",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(managerClient, "create_ship_series", {
        manufacturer_id: otherManufacturer.id,
        name: "Cutlass",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(managerClient, "update_ship_series", {
        series_id: otherSeries.id,
        name: "Cutlass",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(managerClient, "create_ship_variant", {
        series_id: series.id,
        name: "Cutlass Black",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(managerClient, "update_ship_variant", {
        variant_id: variant.id,
        links: [RSI_LINK, { ...RSI_LINK, url: "https://example.com/cutlass" }],
      }),
    ).toMatch(VALIDATION_RESULT);

    // One answer for an unknown page and for a page that the manager cannot read
    const restrictedPage = await createWikiPage(prisma, {
      title: "Geheimes Handbuch",
      visibility: WikiPageVisibility.RESTRICTED,
      roleAccess: [
        {
          roleId: (await createRole(prisma, { name: "vorstand" })).id,
          type: WikiPageAccessType.READ,
        },
      ],
    });
    const publicPage = await createWikiPage(prisma, {
      title: "Cutlass Handbuch",
      visibility: WikiPageVisibility.PUBLIC,
    });
    expect(
      await callForError(managerClient, "update_ship_variant", {
        variant_id: variant.id,
        wiki_page_id: restrictedPage.id,
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForContent(managerClient, "update_ship_variant", {
        variant_id: variant.id,
        wiki_page_id: publicPage.id,
      }),
    ).toMatchObject({ wiki_page_id: publicPage.id });
    expect(
      await callForContent(managerClient, "update_ship_variant", {
        variant_id: variant.id,
        wiki_page_id: "",
      }),
    ).toMatchObject({ wiki_page_id: null });

    expect(
      await prisma.manufacturer.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
    ).toEqual([{ name: "Aegis Dynamics" }, { name: "Drake Interplanetary" }]);
    expect(await prisma.series.count({ where: { name: "Cutlass" } })).toBe(1);
    expect(await prisma.variant.count()).toBe(2);
    expect(await prisma.variantExternalLink.count()).toBe(0);

    // ship;read can read the catalog, but not change it
    const pilotClient = await connectMcpClient(
      (await authorizeMcpClient(pilot.user)).accessToken,
    );
    const pilotToolNames = await pilotClient.listToolNames();
    expect(pilotToolNames).toEqual(
      expect.arrayContaining([
        "list_ship_manufacturers",
        "search_ship_variants",
      ]),
    );
    for (const toolName of [
      "get_ship_variant",
      "create_ship_manufacturer",
      "update_ship_manufacturer",
      "delete_ship_manufacturer",
      "create_ship_series",
      "update_ship_series",
      "delete_ship_series",
      "create_ship_variant",
      "update_ship_variant",
      "delete_ship_variant",
    ])
      expect(pilotToolNames).not.toContain(toolName);
    await expect(
      pilotClient.callTool("delete_ship_manufacturer", {
        manufacturer_id: manufacturer.id,
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });
    expect(await prisma.manufacturer.count()).toBe(2);
  });
});
