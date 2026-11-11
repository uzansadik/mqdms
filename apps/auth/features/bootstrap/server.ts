"use server";

import { bootstrapSchema } from "./schema";
import { createSuperadmin, getBootstrapStatus, InvalidBootstrapKeyError } from "./service";

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
    const status = await getBootstrapStatus();

    if (!status.available) {
      return {
        success: false,
        error:
          status.reason === "already-initialized"
            ? "A superadmin account already exists"
            : "Bootstrap is disabled on this server",
      };
    }

    await createSuperadmin(parsed.data);

    return { success: true };
  } catch (error) {
    if (error instanceof InvalidBootstrapKeyError) {
      return {
        success: false,
        error: "Invalid bootstrap key",
      };
    }

    // Do not expose database errors, internal
    // configuration or bootstrap secrets.
    return {
      success: false,
      error: "Bootstrap failed or is unavailable",
    };
  }
}
