import * as z from "zod";

/** The same rule as `SilcSetting_value_check` */
export const auecConversionRateSchema = z.coerce.number().int().min(1);

export const DEFAULT_AUEC_CONVERSION_RATE = 1;
