import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

export type UserRole = "STUDENT" | "ORGANIZER" | "ADMIN";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: UserRole;
    studentId?: string | null;
    level?: string | null;
    specialty?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      studentId?: string | null;
      level?: string | null;
      specialty?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    studentId?: string | null;
    level?: string | null;
    specialty?: string | null;
  }
}
