import { LanguageSelect } from "@/components/language-switcher";
import { requireSession } from "@/features/auth/session";
import { ChangePasswordForm } from "@/features/profile/change-password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { SessionsSection } from "./sessions-section";

export default async function ProfilePage() {
  const session = await requireSession();

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
