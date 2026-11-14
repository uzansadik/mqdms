import { executeImportJob } from "@mqdms/imports";
import type { JobPayloads } from "@mqdms/queue";
import type { Job } from "bullmq";

type ImportExecuteJob = JobPayloads["import.execute"];

/**
 * Onaylanmış içe aktarımı çalıştırır.
 *
 * Yazma adımı worker'da yapılır: büyük dosyalar istek zaman aşımına
 * uğramaz ve kullanıcı arayüzü meşgul olmaz. İş tek transaction içinde
 * yazılır; bir satır başarısız olursa hiçbiri yazılmaz.
 */
export async function processImportExecute(job: Job<ImportExecuteJob>) {
  const { importJobId, organizationId, actorId } = job.data;

  console.log("[worker] import.execute", {
    jobId: job.id,
    importJobId,
    organizationId,
  });

  const result = await executeImportJob({
    organizationId,
    actorId,
    importJobId,
  });

  console.log("[worker] import.execute completed", {
    jobId: job.id,
    importJobId,
    ...result,
  });

  return result;
}
