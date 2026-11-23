import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        try {
          if (process.env.MONGODB_URI) {
            await connectToDatabase();
            const existingUser = await User.findOne({ email: user.email });

            if (existingUser) {
              // Existing user in DB: update googleId or image if changed
              let modified = false;
              if (!existingUser.googleId && account.providerAccountId) {
                existingUser.googleId = account.providerAccountId;
                modified = true;
              }
              if (user.image && !existingUser.image) {
                existingUser.image = user.image;
                modified = true;
              }
              if (modified) {
                await existingUser.save();
              }
            }
            // Note: If user does not exist in DB yet, do not create with completed onboarding.
            // They will be redirected to /onboarding to set their location and profile.
          }
          return true;
        } catch (error) {
          console.error("Error during Google OAuth sign in:", error);
          return true;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          (session.user as any).id = token.sub;
        }
        if (token.role) {
          (session.user as any).role = token.role;
        }
        (session.user as any).onboardingCompleted = !!token.onboardingCompleted;
        (session.user as any).inDb = !!token.inDb;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.sub = user.id;
      }
      if (token.email && process.env.MONGODB_URI) {
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            token.inDb = true;
            token.onboardingCompleted = !!dbUser.onboardingCompleted;
            token.role = dbUser.role || "user";
          } else {
            token.inDb = false;
            token.onboardingCompleted = false;
          }
        } catch (err) {
          console.error("Error fetching user in jwt callback:", err);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "vayumitra-default-nextauth-secret-change-in-env",
};
