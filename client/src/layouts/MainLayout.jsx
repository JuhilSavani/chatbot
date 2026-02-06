import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../utils/hooks/useAuth";
import Loading from "../pages/Loading";
import useLogout from "../utils/hooks/useLogout";

// Removed
const NavBar = ({ auth }) => {
  const { logout, logoutError, logoutLoading } = useLogout();

  let links = [];

  if (auth?.isAuthenticated) {
    // common links for all logged-in users
    links.push({ to: "/chat", label: "Chat" });
  } else {
    // not logged in
    links.push({ to: "/login", label: "Login" });
    links.push({ to: "/register", label: "Register" });
  }

  return (
    <nav>

      {links.map(link => (
        <Link key={link.to} to={link.to}>
          {link.label}
        </Link>
      ))}

      {auth?.isAuthenticated && (
        <button
          onClick={logout}
          className="logout-btn"
          disabled={logoutLoading}
        >
          {logoutLoading ? "..." : "Logout"}
        </button>
      )}

      {logoutError && <span className="error">{logoutError}</span>}
    </nav>
  )
}

function MainLayout() {
  const { auth, loading } = useAuth();

  if (loading) return <Loading />;

  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return (
    <div className={auth?.isAuthenticated ? "authenticated" : ""}>
      {/* <Navbar auth={auth} /> */}
      <Outlet />
    </div>
  );
}

export default MainLayout;