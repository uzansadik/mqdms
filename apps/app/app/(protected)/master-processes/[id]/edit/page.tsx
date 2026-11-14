import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { MasterProcessForm } from "@/features/master-processes/components/master-process-form";
import {
  getProcessDetailData,
  requireMasterProcessesAccess,
} from "@/features/master-processes/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Master Process düzenleme ekranı. */
export default async function EditMasterProcessPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireMasterProcessesAccess("update");

  const { id } = await params;

  const data = await getProcessDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <MasterProcessForm
        process={{
          id: data.process.id,
          code: data.process.code,
          name: data.process.name,
          description: data.process.description,
          category: data.process.category,
          status: data.process.status,
        }}
      />
    </div>
  );
}
