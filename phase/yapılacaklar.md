# Yapılacaklar

Durum: 2026-11-14 itibarıyla 3 grup halinde tamamlandı.

## 1. Side-bar'da gereksiz Synoptic ve FMEA menü itemlerini çıkar. ✅

FMEA ve sinoptik modülleri hâlâ yer tutucu; menü girişleri kaldırıldı. Rotalar ve
izinler korundu.

## 2. Customer kayıt olduktan sonra toaster ile uyarı ver. Form işlemlerinin genelinde bunu kural olarak tut. ✅

Müşteri, tesis, ürün, ürün grubu, proje ve BOM formlarında başarılı kayıt artık
toast ile bildiriliyor.

## 3. Customer'a logo eklenebilir olsun. ✅

Logo, presigned URL ile doğrudan nesne depolamaya yüklenir; veritabanında yalnızca
nesne anahtarı tutulur. Müşteri formunda yüklenir, listede görünür.
Migration: `0006_lucky_abomination.sql`.

## 4. Customer list sayfasında Site ve aktive projects tam çalışmıyor 0 gösteriyor. ✅

Drizzle'in tek tablo optimizasyonu alt sorgudaki dış referansı niteliksizleştiriyor
ve sayaç kendine referanslı hâle gelerek 0 dönüyordu. Dış referans nitelikli
yazıldı; regresyon testi eklendi.

## 5. Customer Kontak silinebilir ve düzenlenebilir olmalı. ✅

Servis ve action katmanı zaten yazılıydı, hiçbir bileşen kullanmıyordu. Artık
diyalogda düzenlenir, arşivlenir (onaylı) ve arşivden çıkarılabilir.

## 6. Site kısmıda eklendiğinde silinebilir veya düzenlebilir olmalı. ✅

Aynı düzenleme siteler için de yapıldı. Site fiziksel olarak silinmez: sitee
bağlı projeler vardır.

## 7. Navbar user kısmını auth benzeri olsun. logout / settings olsun. ✅

İş uygulamasına auth ile aynı kullanıcı menüsü eklendi: profil, ayarlar, çıkış.

## 8. Navbardan settings'e app.mqdms.com/setting gitsin. şuan için dil ve tema seçimi yapılabilsin. ✅

`/settings` sayfası eklendi: dil seçimi (zaten `next-themes` üzerindeydi) ve tema
seçimi (açık/koyu/sistem).

## 9. Plants listesindeki active proje kısmı iyi çalışmıyor 0 gösteriyor kayıt olmasına rağmen. ✅

Aynı sayaç hatası; ayrıca sütun etiketi ve filtresi "aktif proje" ile tutarlı
hale getirildi.

## 10. Plants kayıt olduktan sonra listeye yönlendirsin ve toaster ile başarılı uyarısı versin. ✅

## 11. Items kayıt ve editten sonra toast ile listeye dönebilir. ✅

## 12. Imports çalışmıyor. taslak doküman indirilebilir olarak verilebilir. ama sıkıntı rowları - columnları görmüyor. eşleştiremiyorum. ✅

- Eşleştirme ekranında dosyanın ilk satırları gösteriliyor.
- Başlıklar otomatik eşleşiyor (türkçe takma adlar dâhil), zorunlu alanlar işaretli.
- "Eşleştirilmedi" seçimi artık tüm doğrulamayı kilitlemiyor.
- Önizlemede "yalnızca hatalı satırlar" filtresi ve sayfalama var (50.000 satır
  tarayıcıyı kilitliyordu).
- Her import türü için XLSX şablon indirilebiliyor (başlıklar, örnek satır ve
  alan açıklaması sayfası).

## 13. auth.mqdms.com başarılı girişinden sonra NEXT_PUBLIC_BUSINESS_APP_URL a yönlendir. ✅

Doğrudan giriş sayfasından giren kullanıcı artık iş uygulamasına yönlendiriliyor;
organizasyon seçim ekranı da aynı şekilde davranıyor.

## Kalan

- Master process listesindeki "Şablon kütüphanesini yükle" düğmesi demo kütüphaneyi
  kurar; production organizasyonlarına otomatik yükleme yapılmaz.
