import { notFound } from "next/navigation";
import { BootstrapForm } from "@/features/bootstrap/components/bootstrap-form";
import { isBootstrapAvailable } from "@/features/bootstrap/service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const available = await isBootstrapAvailable();

  if (!available) {
    notFound();
  }

  return <BootstrapForm />;
}
