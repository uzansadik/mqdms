import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-brand px-6 py-16">
      <Card className="w-full max-w-xl border-white/10 bg-white/5 text-white shadow-2xl shadow-black/20 backdrop-blur">
        <CardHeader className="items-center gap-6 text-center">
          <Image
            src="/images/logob.png"
            alt="MQDMS"
            width={264}
            height={83}
            preload
            className="h-16 w-auto sm:h-20"
          />

          <Badge variant="outline" className="border-brand-accent/40 text-brand-accent">
            <ShieldCheck className="mr-1.5 size-3.5" />
            Kalite Yönetim Sistemi
          </Badge>

          <div className="space-y-2">
            <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
              MQDMS Kalite Yönetim Sistemi
            </CardTitle>

            <CardDescription className="text-white/60">
              Süreç, FMEA, üretim ve stok yönetiminizi tek platformda yönetin.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex justify-center">
          <Button asChild size="lg" className="bg-brand-accent text-brand hover:bg-brand-accent/90">
            <Link href="/login">
              Giriş
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
