import { z } from "zod";

/** Ölçüm boyutu. */
export const unitDimensionSchema = z.enum(["MASS", "LENGTH", "AREA", "VOLUME", "COUNT", "OTHER"]);

/** Birim oluşturma formu. */
export const unitFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Birim kodu zorunludur.")
    .max(32, "Birim kodu en fazla 32 karakter olabilir.")
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(1, "Birim adı zorunludur.")
    .max(120, "Birim adı en fazla 120 karakter olabilir."),

  dimension: unitDimensionSchema,

  decimalPlaces: z.number().int().min(0).max(6),

  /**
   * 1 birim bu = conversionFactor × taban birim.
   *
   * Boş bırakılırsa bu birim boyutun **taban birimi** olur.
   */
  conversionFactor: z
    .number()
    .positive("Dönüşüm faktörü sıfırdan büyük olmalıdır.")
    .optional()
    .or(z.literal("")),

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;
