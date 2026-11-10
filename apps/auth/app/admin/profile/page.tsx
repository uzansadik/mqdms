import { LanguageSelect } from "@/components/language-switcher";
import { requireFreshSession } from "@/features/auth/session";
import { ChangePasswordForm } from "@/features/profile/change-password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { SessionsSection } from "@/features/profile/sessions-section";

/**
 * Platform seviyesinde profil ayarları.
 *
 * Superadmin'in bir organizasyon üyesi olması gerekmez; bu yüzden
 * `/settings/*` altındaki kuruma bağlı sayfalara erişemez. Profil, parola ve
 * oturum yönetimi burada, organizasyon bağımsız olarak sunulur.
 */
export default async function AdminProfilePage() {
  const session = await requireFreshSession();

  return (
    <div className="flex gap-8 flex-col ">
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <ChangePasswordForm />
      <SessionsSection />
      <LanguageSelect />
    </div>
  );
}
