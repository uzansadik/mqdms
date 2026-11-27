import { redirect } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { getFmeaDocumentHref, requireFmeaAccess } from "@/features/fmea/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * FMEA belgesi detayına yönlendirme.
 *
 * Belgenin asıl adresi Process Variant Revision içindedir; bu rota yalnızca
 * global dizinden gelen eski bağlantıları karşılar.
 */
export default async function FmeaDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const { id } = await params;

  const href = await getFmeaDocumentHref(context.organizationId, id);

  if (!href) {
    redirect("/fmea");
  }

  redirect(href);
}
