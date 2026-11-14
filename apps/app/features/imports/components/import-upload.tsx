"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createImportJobAction } from "../actions";
import { type ImportType, importFields } from "../schema";

type ImportUploadProps = {
  /** Import türleri ve hedef alanları. */
  importTypes: { value: ImportType; label: string }[];
};

/**
 * Dosya yükleme ve import işi oluşturma.
 *
 * Dosya doğrudan depolamaya yüklenir; uygulama sunucusu yalnızca referansı
 * alır. Yüklemeden sonra kolon eşleştirme ekranı açılır.
 */
export function ImportUpload({ importTypes }: ImportUploadProps) {
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<ImportType>(importTypes[0]?.value ?? "ITEM");
  const [sourceSystem, setSourceSystem] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file: File) {
    setIsUploading(true);

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "import-file",
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const body = await presignResponse.text();

        throw new Error(`Yükleme başlatılamadı: ${body}`);
      }

      const upload = (await presignResponse.json()) as {
        key: string;
        uploadUrl: string;
        headers: Record<string, string>;
      };

      const putResponse = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: file,
      });

      if (!putResponse.ok) {
        throw new Error("Dosya yüklenemedi.");
      }

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose: "import-file", key: upload.key }),
      });

      if (!completeResponse.ok) {
        throw new Error("Yüklenen dosya doğrulanamadı.");
      }

      const result = await createImportJobAction({
        importType,
        sourceSystem: sourceSystem || undefined,
        fileName: file.name,
        fileKey: upload.key,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("imports.actions.uploaded"));

      router.push("/imports");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dosya yüklenemedi.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const fields = importFields[importType];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("imports.upload.title")}</CardTitle>

        <CardDescription>{t("imports.upload.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="importType">{t("imports.upload.importType.label")}</FieldLabel>

              <NativeSelect
                id="importType"
                onChange={(event) => setImportType(event.target.value as ImportType)}
                value={importType}
              >
                {importTypes.map((type) => (
                  <NativeSelectOption key={type.value} value={type.value}>
                    {type.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="sourceSystem">
                {t("imports.upload.sourceSystem.label")}
              </FieldLabel>

              <Input
                id="sourceSystem"
                onChange={(event) => setSourceSystem(event.target.value)}
                placeholder={t("imports.upload.sourceSystem.placeholder")}
                value={sourceSystem}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="file">{t("imports.upload.file.label")}</FieldLabel>

            <Input
              accept=".csv,.xlsx"
              disabled={isUploading}
              id="file"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void upload(file);
                }
              }}
              ref={fileInputRef}
              type="file"
            />

            <p className="text-xs text-muted-foreground">
              {t("imports.upload.hint")} · {fields.length} alan
            </p>
          </Field>

          {isUploading && (
            <Button disabled type="button">
              {t("imports.upload.uploading")}
            </Button>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
