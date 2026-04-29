import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db/prisma";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
    }),
    CredentialsProvider({
      id: "siwe",
      name: "Solana/Ethereum Wallet",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          const siwe = new SiweMessage(credentials?.message || "");
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");
          
          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: nextAuthUrl.host,
            nonce: cookies().get("siwe-nonce")?.value,
          });

          if (!result.success) return null;

          const normalizedAddress = siwe.address.toLowerCase();
          const isAdmin = normalizedAddress === process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
          
          // Use upsert to handle new or returning wallet users
          const user = await prisma.user.upsert({
            where: { address: normalizedAddress },
            update: {
              role: isAdmin ? 'ADMIN' : undefined
            },
            create: {
              address: normalizedAddress,
              role: isAdmin ? 'ADMIN' : 'USER'
            }
          });

          // Check active subscription status
          const subscription = await prisma.subscription.findFirst({
            where: { userId: user.id, isActive: true, expiresAt: { gte: new Date() } }
          });

          return {
            id: user.id,
            name: user.name || `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
            email: user.email,
            image: user.image,
            role: user.role,
            address: user.address ?? undefined,
            isSubscribed: !!subscription
          };
        } catch (e) {
          console.error("SIWE Authorization Error:", e);
          return null;
        }
      }
    }),
    CredentialsProvider({
      name: "Admin Credentials",
      id: "admin-credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username === (process.env.ADMIN_USERNAME || 'admin') && 
            credentials?.password === (process.env.ADMIN_PASSWORD || 'admin123')) {
          
          let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
          
          if (!adminUser) {
            adminUser = await prisma.user.create({
              data: {
                name: 'System Administrator',
                email: 'admin@dyllicit.network',
                role: 'ADMIN',
                address: '0x0000000000000000000admin'
              }
            });
          }
          return { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'ADMIN', isSubscribed: false };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn Attempt:", { id: user.id, email: user.email, provider: account?.provider });
      
      const cookieStore = cookies();
      const pendingRole = cookieStore.get("dyllicit_pending_role")?.value;
      
      if (pendingRole && (pendingRole === "LISTENER" || pendingRole === "ARTIST") && user.id) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
          
          if (dbUser?.role === 'ADMIN') {
            cookieStore.delete("dyllicit_pending_role");
            return true;
          }

          // If it's a very new user or doesn't have a role, set it
          if (!dbUser || !dbUser.role || (Date.now() - new Date(dbUser.createdAt).getTime() < 60000)) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: pendingRole }
            });
            (user as any).role = pendingRole;
          }

          cookieStore.delete("dyllicit_pending_role");
        } catch(e) {
          console.error("SignIn Callback Error:", e);
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "LISTENER";
        token.address = (user as any).address || null;
        token.isSubscribed = (user as any).isSubscribed || false;

        // Fetch latest data if it's a new sign in to ensure session is fresh
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, address: true, subscriptions: { where: { isActive: true, expiresAt: { gte: new Date() } } } }
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.address = dbUser.address;
          // Admin is NO LONGER automatically subscribed. They must have a valid subscription like anyone else.
          token.isSubscribed = dbUser.subscriptions.length > 0;
        }
      }

      // Handle session updates (e.g. after profile update or wallet binding)
      if (trigger === "update") {
        // Re-fetch user from DB to ensure we have the absolute latest and most secure data
        const updatedDbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, address: true, name: true, image: true, subscriptions: { where: { isActive: true, expiresAt: { gte: new Date() } } } }
        });

        if (updatedDbUser) {
          token.role = updatedDbUser.role;
          token.address = updatedDbUser.address;
          token.name = updatedDbUser.name;
          token.image = updatedDbUser.image;
          token.isSubscribed = updatedDbUser.subscriptions.length > 0;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.address = token.address as string | undefined;
        session.user.isSubscribed = token.isSubscribed as boolean;
      }
      return session;
    },
  },
  pages: {
    newUser: "/onboarding",
    signIn: "/explore",
  },
};
