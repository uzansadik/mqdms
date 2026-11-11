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
          <CardTitle>Superadmin bootstrap is not available</CardTitle>
          <CardDescription>
            {status.reason === "already-initialized"
              ? "A superadmin account already exists. Sign in to manage users and organizations."
              : "Bootstrap is disabled on this server. An administrator has to enable it before the first superadmin can be created."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <BootstrapForm />;
}
