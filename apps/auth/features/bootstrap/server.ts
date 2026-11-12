"use server";

import { bootstrapSchema } from "./schema";
import {
  bootstrapOrganization,
  getBootstrapStatus,
  InvalidBootstrapKeyError,
} from "./service";

type BootstrapResult = { success: true } | { success: false; error: string };

export async function bootstrapOrganizationAction(input: unknown): Promise<BootstrapResult> {
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
            ? "This instance is already initialized."
            : "Bootstrap is disabled on this server.",
      };
    }

    await bootstrapOrganization(parsed.data);

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
