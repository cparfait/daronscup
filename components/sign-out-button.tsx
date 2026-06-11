"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="size-4" />
      Se déconnecter
    </Button>
  );
}
