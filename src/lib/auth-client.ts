"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin: baseURL is inferred. Set NEXT_PUBLIC_APP_URL for cross-origin setups.
});

export const { signIn, signUp, signOut, useSession } = authClient;
