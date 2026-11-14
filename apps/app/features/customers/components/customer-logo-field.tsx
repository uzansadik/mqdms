"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@mqdms/ui/components/field";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CustomerLogoFieldProps = {
  /** Yüklenmiş logonun depolama anahtarı. */
  value: string | null;

  /** Logonun görüntülenebilir adresi (herkese açık depolama). */
  previewUrl: string | null;

  /** Anahtar değiştiğinde çağrılır. */
  onChange: (key: string | null) => void;
};

/**
 * Müşteri logosu yükleme alanı.
 *
 * Dosya doğrudan depolamaya yüklenir (presigned URL); uygulama sunucusu dosyanın
 * içeriğini görmez. Yalnızca nesne anahtarı forma gönderilir.
 */
export function CustomerLogoField({ value, previewUrl, onChange }: CustomerLogoFieldProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  /*
   * Önizleme yerelde tutulur: yeni yüklemeden sonra adres değişir, kayıt
   * ancak form kaydedildiğinde güncellenir.
   */
  const [preview, setPreview] = useState<string | null>(previewUrl);

  useEffect(() => {
    setPreview(previewUrl);
  }, [previewUrl]);

  async function upload(file: File) {
    setIsUploading(true);

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "customer-logo",
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
        throw new Error("Logo yüklenemedi.");
      }

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose: "customer-logo", key: upload.key }),
      });

      if (!completeResponse.ok) {
        throw new Error("Yüklenen logo doğrulanamadı.");
      }

      const result = (await completeResponse.json()) as { key: string; url: string | null };

      onChange(result.key);
      setPreview(result.url);

      toast.success(t("customers.logo.uploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo yüklenemedi.");
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function remove() {
    onChange(null);
    setPreview(null);

    toast.success(t("customers.logo.removed"));
  }

  return (
    <Field>
      <FieldLabel htmlFor="customer-logo">{t("customers.logo.label")}</FieldLabel>

      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {preview ? (
            // Logo içeriği depolamadan gelir; standart <img> bilinçli kullanılır.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={t("customers.logo.label")}
              className="size-full object-contain"
              src={preview}
            />
          ) : (
            <span className="text-xs text-muted-foreground">{t("customers.logo.empty")}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            {isUploading ? t("customers.logo.uploading") : t("customers.logo.upload")}
          </Button>

          {value && (
            <Button onClick={remove} size="sm" type="button" variant="ghost">
              {t("customers.logo.remove")}
            </Button>
          )}
        </div>

        <input
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="customer-logo"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void upload(file);
            }
          }}
          ref={inputRef}
          type="file"
        />
      </div>

      <FieldDescription>{t("customers.logo.description")}</FieldDescription>
    </Field>
  );
}
