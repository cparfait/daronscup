import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

// Le callback `authorized` (lib/auth.config.ts) décide quoi protéger.
export default NextAuth(authConfig).auth;

export const config = {
  // Protège tout sauf assets statiques, images et le service worker PWA.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
