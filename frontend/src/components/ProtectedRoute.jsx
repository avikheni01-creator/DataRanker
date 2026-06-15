"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthed } from "@/lib/auth";

// Gates the /app/* subtree. If the simulated auth flag isn't set, bounce to
// /login and remember where the user was headed. Auth lives in localStorage,
// so the check must run client-side after mount (avoids SSR/hydration flash).
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isAuthed()) {
      setAllowed(true);
    } else {
      const from = encodeURIComponent(pathname || "/app");
      router.replace(`/login?from=${from}`);
    }
  }, [router, pathname]);

  if (!allowed) return null;
  return children;
}
