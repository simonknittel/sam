import * as z from "zod";

/** The aUEC value of one SILC, the same rule as `SilcSetting_value_check` */
export const auecConversionRateSchema = z.coerce.number().int().min(1);

/** Without a stored rate, one SILC has the value of one aUEC */
export const DEFAULT_AUEC_CONVERSION_RATE = 1;
