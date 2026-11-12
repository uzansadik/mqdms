import { Card, CardDescription, CardHeader, CardTitle } from "@mqdms/ui/components/card";

import { BootstrapForm } from "@/features/bootstrap/components/bootstrap-form";
import { getBootstrapStatus } from "@/features/bootstrap/service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const status = await getBootstrapStatus();

  /*
   * Bootstrap kullanılamıyorsa 404 dönmek iki farklı durumu (kapalı olması
   * ve zaten tamamlanmış olması) birbirine karıştırıyordu. Açıklama, sorunun
   * kaynağını operatöre doğrudan gösterir.
   */
  if (!status.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization bootstrap is not available</CardTitle>
          <CardDescription>
            {status.reason === "already-initialized"
              ? "This instance is already initialized. Sign in with your owner account."
              : "Bootstrap is disabled on this server. An administrator has to enable it before the first organization can be created."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <BootstrapForm />;
}
