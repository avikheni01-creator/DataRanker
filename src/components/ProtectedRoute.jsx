import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../auth";

// Gates the /app/* subtree. If the simulated auth flag isn't set, bounce to
// /login and remember where the user was headed.
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
