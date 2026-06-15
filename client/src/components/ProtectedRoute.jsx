import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed, fetchMe } from "../auth";
import { colors, fonts } from "../theme";

// Gates the /app/* subtree. Optimistically trusts the cached user, then verifies
// the httpOnly-cookie session with the server. Bounces to /login if invalid.
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  // null = checking, true/false = result. Start from cached optimistic state.
  const [ok, setOk] = useState(isAuthed() ? null : false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthed()) {
      setOk(false);
      return;
    }
    fetchMe().then((user) => {
      if (!cancelled) setOk(Boolean(user));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ok === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: colors.textMuted,
          fontFamily: fonts.sans,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!ok) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
