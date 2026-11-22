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

            if (!existingUser) {
              await User.create({
                name: user.name || "VayuMitra User",
                email: user.email,
                image: user.image || "",
                googleId: account.providerAccountId,
                emailVerified: new Date(),
              });
            } else if (!existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              if (user.image && !existingUser.image) {
                existingUser.image = user.image;
              }
              await existingUser.save();
            }
          }
          return true;
        } catch (error) {
          console.error("Error synchronizing user with MongoDB during Google OAuth:", error);
          // Allow sign in to succeed even if MongoDB is temporarily connecting
          return true;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        if (token.role) {
          (session.user as any).role = token.role;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.sub = user.id;
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
