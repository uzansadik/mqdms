import { requireAuthContext, requirePermission } from "@/features/auth/session";
import { DeriveVariantForm } from "@/features/process-variants/components/derive-variant-form";
import { listGenericSourceRevisions } from "@/features/process-variants/repository";

type PageProps = {
  params: Promise<{ processId: string }>;
};

/** Jenerik varyantan özelleştirilmiş varyant türetme ekranı. */
export default async function DeriveProcessVariantPage({ params }: PageProps) {
  const context = await requireAuthContext();

  /*
   * Türetme `masterProcesses:derive` yetkisi gerektirir; okuma yetkisi olan
   * bir kullanıcıya formu göstermek, hata mesajını ancak gönderimde
   * göstermek anlamına gelirdi.
   */
  await requirePermission("masterProcesses", "derive");

  const { processId } = await params;

  const sources = await listGenericSourceRevisions(context.organizationId, processId);

  return (
    <div className="space-y-6">
      <DeriveVariantForm processId={processId} sources={sources} />
    </div>
  );
}
