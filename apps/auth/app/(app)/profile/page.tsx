import { LanguageSelect } from "@mqdms/i18n/language-select";
import { requireRequestContext } from "@/features/auth/context";
import { ChangePasswordForm } from "@/features/profile/change-password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { SessionsSection } from "@/features/profile/sessions-section";

export default async function ProfilePage() {
  const context = await requireRequestContext();

  return (
    <div className="flex gap-8 flex-col ">
      <ProfileForm
        user={{
          name: context.user.name,
          email: context.user.email,
          image: null,
        }}
      />
      <ChangePasswordForm />
      <SessionsSection />
      <LanguageSelect />
    </div>
  );
}
