import { config } from "dotenv";

/*
 * `.env` dosyası repo kökünde durur; drizzle-kit ise paket dizininden
 * çalıştığı için yol açıkça veriliyor. `dotenv` mevcut ortam değişkenlerini
 * ezmez; kök scriptlerinin (`dotenv -e .env -- ...`) verdiği değerler önceliklidir.
 *
 * Bu modül `@mqdms/env/server` import edilmeden ÖNCE değerlendirilmelidir:
 * env şeması import anında doğrulanır ve `.env` yüklenmeden önce çalışırsa
 * doğrulama hatası verir. Bu yüzden `drizzle.config.ts` bu dosyayı yan etki
 * importu olarak en üstte içe aktarır.
 */
config({ path: "../../.env" });
