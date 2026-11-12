import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import Link from "next/link";

/**
 * Yetki hatası ekranı.
 *
 * `forbidden()` çağrıldığında Next.js 403 durum koduyla bu ekranı gösterir.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>

          <CardDescription>
            You are not authorized to access this resource. Ask the organization owner for the
            missing role or permission.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
