import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { UserRole } from "@/types/next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        let role = (user.role as UserRole) ?? "STUDENT";

        // Auto-promote to ADMIN on sign-in if matching process.env.ADMIN_EMAIL
        if (
          user.email &&
          process.env.ADMIN_EMAIL &&
          user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
        ) {
          role = "ADMIN";
          try {
            if (user.id) {
              await prisma.user.update({
                where: { id: user.id },
                data: { role: "ADMIN" },
              });
            }
          } catch (e) {
            console.error("[Auth] Auto-promote ADMIN in DB error:", e);
          }
        }

        token.role = role;
        token.studentId = user.studentId ?? null;
        token.level = user.level ?? null;
        token.specialty = user.specialty ?? null;
      } else if (token.id) {
        // Fetch fresh role and academic profile from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, studentId: true, email: true, level: true, specialty: true },
          });
          if (dbUser) {
            let role = dbUser.role as UserRole;
            if (
              dbUser.email &&
              process.env.ADMIN_EMAIL &&
              dbUser.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() &&
              role !== "ADMIN"
            ) {
              role = "ADMIN";
              await prisma.user.update({
                where: { id: token.id as string },
                data: { role: "ADMIN" },
              });
            }
            token.role = role;
            token.studentId = dbUser.studentId;
            token.level = dbUser.level;
            token.specialty = dbUser.specialty;
          }
        } catch {
          // ignore DB lookup errors
        }
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      if (
        user.email &&
        process.env.ADMIN_EMAIL &&
        user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
      ) {
        try {
          if (user.id) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
          }
        } catch (e) {
          console.error("[Auth] Set ADMIN on createUser error:", e);
        }
      }
    },
  },
});
