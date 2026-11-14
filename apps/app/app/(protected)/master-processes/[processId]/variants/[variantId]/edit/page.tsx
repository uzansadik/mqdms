import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ProcessVariantForm } from "@/features/process-variants/components/process-variant-form";
import {
  getProcessVariantDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string }>;
};

/** Process Variant düzenleme ekranı. */
export default async function EditProcessVariantPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("update");

  const { variantId } = await params;

  const data = await getProcessVariantDetailData(context.organizationId, variantId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProcessVariantForm
        processId={data.variant.processId}
        variant={{
          id: data.variant.id,
          code: data.variant.code,
          name: data.variant.name,
          description: data.variant.description,
          variantType: data.variant.variantType,
          status: data.variant.status,
        }}
      />
    </div>
  );
}
