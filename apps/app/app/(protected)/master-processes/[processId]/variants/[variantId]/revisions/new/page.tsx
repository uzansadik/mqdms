import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ProcessVariantRevisionForm } from "@/features/process-variants/components/process-variant-revision-form";
import {
  getProcessVariantDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string }>;
};

/** Yeni revision oluşturma ekranı. */
export default async function NewProcessVariantRevisionPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("update");

  const { variantId } = await params;

  const data = await getProcessVariantDetailData(context.organizationId, variantId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProcessVariantRevisionForm processId={data.variant.processId} variantId={data.variant.id} />
    </div>
  );
}
