import type { MessageKey } from "./en";

export const tr = {
  "common.save": "Kaydet",
  "common.cancel": "İptal",
  "common.delete": "Sil",
  "common.edit": "Düzenle",
  "common.confirm": "Onayla",

  "navigation.dashboard": "Kontrol Paneli",
  "navigation.settings": "Ayarlar",
  "navigation.organization": "Organizasyon",

  "dashboard.title": "Kontrol Paneli",
  "dashboard.welcome": "Tekrar hoş geldin, {name}",
  "dashboard.members": "Üyeler",

  "settings.title": "Ayarlar",
  "settings.language": "Dil",

  "language.english": "English",
  "language.turkish": "Türkçe",

  "auth.login": "Giriş yap",
  "auth.logout": "Çıkış yap",
  "auth.register": "Hesap oluştur",

  "auth.login.title": "Giriş yap",
  "auth.login.description": "Devam etmek için bilgilerinizi girin.",
  "auth.login.email": "E-posta",
  "auth.login.password": "Şifre",
  "auth.login.forgotPassword": "Şifremi unuttum",
  "auth.login.submit": "Giriş yap",
  "auth.login.submitting": "Giriş yapılıyor...",
  "auth.login.error": "Giriş yapılamadı. Lütfen tekrar deneyin.",
  "auth.login.noAccount": "Hesabınız yok mu?",
  "auth.login.signUp": "Kayıt ol",

  "auth.layout.headline": "İşinizi tek bir yerden oluşturun ve yönetin.",
  "auth.layout.description":
    "Next.js, TypeScript, Tailwind CSS ve shadcn/ui ile hazırlanmış modern SaaS uygulama başlangıç kiti.",
  "auth.layout.copyright": "© {year} {name}",

  "auth.register.title": "Hesap oluştur",
  "auth.register.description": "Başlamak için hesabınızı oluşturun.",
  "auth.register.name": "Ad Soyad",
  "auth.register.email": "E-posta",
  "auth.register.password": "Şifre",
  "auth.register.confirmPassword": "Şifre (tekrar)",
  "auth.register.submit": "Hesap oluştur",
  "auth.register.submitting": "Hesap oluşturuluyor...",
  "auth.register.error": "Hesabınız oluşturulamadı. Lütfen tekrar deneyin.",
  "auth.register.hasAccount": "Zaten hesabınız var mı?",

  "onboarding.noWorkspace.title": "Henüz workspace yok",
  "onboarding.noWorkspace.description": "Henüz hiçbir organizasyonun üyesi değilsiniz.",
  "onboarding.noWorkspace.hint":
    "Organizasyonları platform superadmin'i oluşturur. Organizasyon sahibinden sizi e-posta ile davet etmesini isteyin.",
  "onboarding.noWorkspace.waiting": "Daveti kabul ettiğinizde workspace'iniz burada görünecek.",

  "permissions.title": "Yetkiler",
  "permissions.description":
    "Roller bir üyenin varsayılan olarak ne yapabileceğini belirler. Burada belirli bir üyeye belirli bir kaynak için izin verebilir veya engelleyebilirsiniz. Engelleme her zaman iznin önünde gelir.",
  "permissions.state.inherit": "Rol",
  "permissions.state.allowed": "İzinli",
  "permissions.state.denied": "Yasak",
  "permissions.state.inheritAllowed": "Rol (izinli)",
  "permissions.state.inheritDenied": "Rol (yasak)",
  "permissions.empty.title": "Üye yok",
  "permissions.empty.description": "Yetki atamak için bir üyeyi davet edin.",

  "admin.layout.title": "Platform yönetimi",
  "admin.overview.title": "Platform",
  "admin.overview.description":
    "Bu kimlik doğrulama sağlayıcısında barındırılan organizasyonları ve kullanıcıları yönetin.",
  "admin.overview.newOrganization": "Yeni organizasyon",
  "admin.overview.recent": "Son organizasyonlar",
  "admin.overview.recentDescription": "En son oluşturulan workspace'ler.",
  "admin.overview.empty": "Henüz organizasyon yok",
  "admin.overview.emptyDescription": "Başlamak için ilk workspace'i oluşturun.",

  "admin.stats.organizations": "Organizasyonlar",
  "admin.stats.organizationsDescription": "Kayıtlı workspace'ler",
  "admin.stats.users": "Kullanıcılar",
  "admin.stats.usersDescription": "Kayıtlı hesaplar",
  "admin.stats.memberships": "Üyelikler",
  "admin.stats.membershipsDescription": "Organizasyon üyelikleri",
  "admin.stats.superadmins": "Superadmin'ler",
  "admin.stats.superadminsDescription": "Platform yöneticileri",

  "admin.organizations.title": "Organizasyonlar",
  "admin.organizations.description": "Bu kimlik doğrulama sağlayıcısına kayıtlı tüm workspace'ler.",
  "admin.organizations.all": "Tüm organizasyonlar",
  "admin.organizations.count": "{count} kayıtlı workspace.",
  "admin.organizations.empty": "Henüz organizasyon yok",
  "admin.organizations.emptyDescription": "Organizasyonları yalnızca superadmin oluşturabilir.",
  "admin.organizations.memberCount": "{count} üye",

  "admin.organization.members": "Üyeler",
  "admin.organization.membersCount": "Bu organizasyonda {count} üye var.",
  "admin.organization.noMembers": "Üye yok",
  "admin.organization.invitations": "Davetler",
  "admin.organization.invitationsCount": "{count} davet.",
  "admin.organization.noInvitations": "Davet yok",
  "admin.organization.fixedRoles": "Sabit roller",
  "admin.organization.fixedRolesDescription":
    "Roller kod içinde tanımlıdır ve bu sağlayıcıdaki tüm organizasyonlar tarafından paylaşılır.",

  "admin.users.title": "Kullanıcılar",
  "admin.users.description": "Bu kimlik doğrulama sağlayıcısına kayıtlı tüm hesaplar.",
  "admin.users.all": "Tüm kullanıcılar",
  "admin.users.count": "{count} hesap.",
  "admin.users.empty": "Henüz kullanıcı yok",
  "admin.users.unverified": "Doğrulanmamış",
  "admin.users.banned": "Yasaklı",
} satisfies Record<MessageKey, string>;
