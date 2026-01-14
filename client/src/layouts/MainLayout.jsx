import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../utils/hooks/useAuth";
import Loading from "../pages/Loading";
import useLogout from "../utils/hooks/useLogout";

function MainLayout() {
  const { auth, loading } = useAuth();
  const { logout, logoutError, logoutLoading } = useLogout();

  if (loading) return <Loading />;

  let links = [];

  if (auth?.isAuthenticated) {
    // common links for all logged-in users
    links.push({ to: "/profile", label: "Profile" });
    links.push({ to: "/blogs", label: "Blogs" });
    
    // role-specific links
    if (auth.user.roles.includes("admin")) {
      links.push({ to: "/admin", label: "Admin" });
      links.push({ to: "/lounge", label: "Lounge" });
    } else if (auth.user.roles.includes("moderator")) {
      links.push({ to: "/moderator", label: "Moderator" });
      links.push({ to: "/lounge", label: "Lounge" });
    }
  } else {
    // not logged in
    links.push({ to: "/login", label: "Login" });
    links.push({ to: "/register", label: "Register" });
  }

  return (
    <div className={auth?.isAuthenticated ? "authenticated" : ""}>
      <nav>
        {links.map(link => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
        {auth?.isAuthenticated && <button onClick={logout} className='logout-btn' disable={logoutLoading}>{logoutLoading ? "..." : "Logout"}</button>}
        {logoutError && <span className="error">{logoutError}</span>}
      </nav>
      
      <Outlet />
    </div>
  );
}

export default MainLayout;