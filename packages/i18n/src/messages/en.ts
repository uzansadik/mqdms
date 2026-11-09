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

  "onboarding.noWorkspace.title": "No workspace yet",
  "onboarding.noWorkspace.description": "You are not a member of any organization yet.",
  "onboarding.noWorkspace.hint":
    "Organizations are created by the platform superadmin. Ask your organization owner to invite you by email.",
  "onboarding.noWorkspace.waiting":
    "Once you accept the invitation, your workspace will appear here.",

  "permissions.title": "Permissions",
  "permissions.description":
    "Roles decide what a member can do by default. Here you can allow or deny a specific resource for a specific member. A denial always wins over an allowance.",
  "permissions.state.inherit": "Inherited",
  "permissions.state.allowed": "Allowed",
  "permissions.state.denied": "Denied",
  "permissions.state.inheritAllowed": "Inherited (allowed)",
  "permissions.state.inheritDenied": "Inherited (denied)",
  "permissions.empty.title": "No members",
  "permissions.empty.description": "Invite a member to assign permissions.",

  "admin.layout.title": "Platform administration",
  "admin.overview.title": "Platform",
  "admin.overview.description":
    "Manage the organizations and users hosted on this authentication provider.",
  "admin.overview.newOrganization": "New organization",
  "admin.overview.recent": "Recent organizations",
  "admin.overview.recentDescription": "Workspaces created most recently.",
  "admin.overview.empty": "No organizations yet",
  "admin.overview.emptyDescription": "Create the first workspace to get started.",

  "admin.stats.organizations": "Organizations",
  "admin.stats.organizationsDescription": "Registered workspaces",
  "admin.stats.users": "Users",
  "admin.stats.usersDescription": "Registered accounts",
  "admin.stats.memberships": "Memberships",
  "admin.stats.membershipsDescription": "Organization memberships",
  "admin.stats.superadmins": "Superadmins",
  "admin.stats.superadminsDescription": "Platform administrators",

  "admin.organizations.title": "Organizations",
  "admin.organizations.description": "Every workspace registered on this authentication provider.",
  "admin.organizations.all": "All organizations",
  "admin.organizations.count": "{count} registered workspaces.",
  "admin.organizations.empty": "No organizations yet",
  "admin.organizations.emptyDescription": "Organizations can only be created by a superadmin.",
  "admin.organizations.memberCount": "{count} members",

  "admin.organization.members": "Members",
  "admin.organization.membersCount": "{count} members in this organization.",
  "admin.organization.noMembers": "No members",
  "admin.organization.invitations": "Invitations",
  "admin.organization.invitationsCount": "{count} invitations.",
  "admin.organization.noInvitations": "No invitations",
  "admin.organization.fixedRoles": "Fixed roles",
  "admin.organization.fixedRolesDescription":
    "Roles are defined in code and shared by every organization on this provider.",

  "admin.users.title": "Users",
  "admin.users.description": "Every account registered on this authentication provider.",
  "admin.users.all": "All users",
  "admin.users.count": "{count} accounts.",
  "admin.users.empty": "No users yet",
  "admin.users.unverified": "Unverified",
  "admin.users.banned": "Banned",
} as const;

export type MessageKey = keyof typeof en;
