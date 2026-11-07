export const en = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.confirm": "Confirm",

  "navigation.dashboard": "Dashboard",
  "navigation.settings": "Settings",
  "navigation.organization": "Organization",

  "dashboard.title": "Dashboard",
  "dashboard.welcome": "Welcome back, {name}",
  "dashboard.members": "Members",

  "settings.title": "Settings",
  "settings.language": "Language",

  "language.english": "English",
  "language.turkish": "Türkçe",

  "auth.login": "Log in",
  "auth.logout": "Log out",
  "auth.register": "Create account",

  "auth.login.title": "Sign in",
  "auth.login.description": "Enter your credentials to continue.",
  "auth.login.email": "Email",
  "auth.login.password": "Password",
  "auth.login.forgotPassword": "Forgot password?",
  "auth.login.submit": "Sign in",
  "auth.login.submitting": "Signing in...",
  "auth.login.error": "Unable to sign in. Please try again.",
  "auth.login.noAccount": "Don't have an account?",
  "auth.login.signUp": "Sign up",

  "auth.layout.headline": "Build and manage your work in one place.",
  "auth.layout.description":
    "A modern SaaS application starter kit. Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
  "auth.layout.copyright": "© {year} {name}",

  "auth.register.title": "Create account",
  "auth.register.description": "Create your account to get started.",
  "auth.register.name": "Name",
  "auth.register.email": "Email",
  "auth.register.password": "Password",
  "auth.register.confirmPassword": "Confirm password",
  "auth.register.submit": "Create account",
  "auth.register.submitting": "Creating account...",
  "auth.register.error": "Unable to create your account. Please try again.",
  "auth.register.hasAccount": "Already have an account?",
} as const;

export type MessageKey = keyof typeof en;
