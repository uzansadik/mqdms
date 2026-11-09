export type AppConfig = {
  name: string;
  slug: string;
  description: string;

  urls: {
    marketing: string;
    app: string;
  };

  support: {
    email: string;
  };
};

export const appConfig = {
  name: "MQDMS",
  slug: "mqdms",

  description:
    "A modern SaaS application starter kit. Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",

  urls: {
    marketing: "http://localhost:3000",
    app: "http://localhost:3000",
  },

  support: {
    email: "support@example.com",
  },
} satisfies AppConfig;
