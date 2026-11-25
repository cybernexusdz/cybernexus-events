import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { UserRole } from "@/types/next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/api/auth/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role as UserRole) ?? "STUDENT";
        token.studentId = user.studentId ?? null;
        token.level = user.level ?? null;
        token.specialty = user.specialty ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.role = ((token.role as UserRole) ?? "STUDENT") as UserRole;
        session.user.studentId = (token.studentId as string | null) ?? null;
        session.user.level = (token.level as string | null) ?? null;
        session.user.specialty = (token.specialty as string | null) ?? null;
      }
      return session;
    },
  },
};
