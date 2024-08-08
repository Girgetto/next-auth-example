import NextAuth from "next-auth";
import "next-auth/jwt";
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import vercelKVDriver from "unstorage/drivers/vercel-kv";
import { UnstorageAdapter } from "@auth/unstorage-adapter";
import type { NextAuthConfig } from "next-auth";

const storage = createStorage({
  driver: process.env.VERCEL
    ? vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
      })
    : memoryDriver(),
});

const config = {
  theme: { logo: "https://authjs.dev/img/logo-sm.png" },
  adapter: UnstorageAdapter(storage),
  providers: [
    {
      authorization: {
        url: `https://auth.pingone.eu/${process.env.PING_TENANT_ID}/as/authorize`,
        params: {
          response_type: "code",
          scope: "openid profile email",
        },
      },
      type: "oauth" as const,
      id: "ping",
      name: "Ping",
      wellKnown: `https://auth.pingone.eu/${process.env.PING_TENANT_ID}/as/.well-known/openid-configuration`,
      userinfo: `https://auth.pingone.eu/${process.env.PING_TENANT_ID}/as/userinfo`,
      token: `https://auth.pingone.eu/${process.env.PING_TENANT_ID}/as/token`,
      profile: (profile: any) => {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      clientId: process.env.PING_CLIENT_ID,
      clientSecret: process.env.PING_CLIENT_SECRET,
      accessTokenUrl: `https://auth.pingone.eu/${process.env.PING_TENANT_ID}/as/token`,
    },
  ],
  basePath: "/auth",
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;

      return session;
    },
  },
  experimental: {
    enableWebAuthn: true,
  },
  debug: process.env.NODE_ENV !== "production" ? true : false,
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
