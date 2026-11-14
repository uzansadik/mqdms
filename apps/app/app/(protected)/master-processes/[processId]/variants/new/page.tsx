import { requireAuthContext } from "@/features/auth/session";
import { ProcessVariantForm } from "@/features/process-variants/components/process-variant-form";
import { requireProcessVariantsAccess } from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string }>;
};

/** Yeni Process Variant oluşturma ekranı. */
export default async function NewProcessVariantPage({ params }: PageProps) {
  await requireAuthContext();

  await requireProcessVariantsAccess("create");

  const { processId } = await params;

  return (
    <div className="space-y-6">
      <ProcessVariantForm processId={processId} />
    </div>
  );
}
