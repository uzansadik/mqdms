"use server";

import { bootstrapSchema } from "./schema";
import { createSuperadmin, isBootstrapAvailable } from "./service";

type BootstrapResult = { success: true } | { success: false; error: string };

export async function bootstrapSuperadminAction(input: unknown): Promise<BootstrapResult> {
  const parsed = bootstrapSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid form data",
    };
  }

  try {
    if (!(await isBootstrapAvailable())) {
      return {
        success: false,
        error: "Bootstrap is unavailable",
      };
    }

    await createSuperadmin(parsed.data);

    return { success: true };
  } catch {
    // Do not expose database errors, internal
    // configuration or bootstrap secrets.
    return {
      success: false,
      error: "Bootstrap failed or is unavailable",
    };
  }
}
