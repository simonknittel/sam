import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findManufacturerRows } from "@sam-monorepo/application";
import { cache } from "react";

export const getManufacturers = cache(
  withTrace("getManufacturers", async () =>
    findManufacturerRows(getApplicationContext()),
  ),
);
