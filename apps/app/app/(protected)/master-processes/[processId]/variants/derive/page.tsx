import { requireAuthContext } from "@/features/auth/session";
import { DeriveVariantForm } from "@/features/process-variants/components/derive-variant-form";
import { listGenericSourceRevisions } from "@/features/process-variants/repository";
import { requireProcessVariantsAccess } from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string }>;
};

/** Jenerik varyantan özelleştirilmiş varyant türetme ekranı. */
export default async function DeriveProcessVariantPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { processId } = await params;

  const sources = await listGenericSourceRevisions(context.organizationId, processId);

  return (
    <div className="space-y-6">
      <DeriveVariantForm processId={processId} sources={sources} />
    </div>
  );
}
