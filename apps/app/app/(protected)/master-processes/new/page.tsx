import { requireAuthContext } from "@/features/auth/session";
import { MasterProcessForm } from "@/features/master-processes/components/master-process-form";
import { requireMasterProcessesAccess } from "@/features/master-processes/server";

/** Yeni Master Process oluşturma ekranı. */
export default async function NewMasterProcessPage() {
  await requireAuthContext();

  await requireMasterProcessesAccess("create");

  return (
    <div className="space-y-6">
      <MasterProcessForm />
    </div>
  );
}
