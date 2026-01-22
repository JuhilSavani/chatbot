import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation } from "react-router-dom"
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Blogs from "./pages/Blogs";
import Admin from "./pages/Admin";
import Moderator from "./pages/Moderator";
import Lounge from "./pages/Lounge";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnAuth from "./pages/UnAuth"
import NotFound from "./pages/NotFound";
import ChatWindow from "./pages/ChatWindow";
import AuthProvider from "./utils/contexts/AuthProvider";
import { useAuth } from "./utils/hooks/useAuth";

// Protected wrapper
function Protected({ children, allowedRoles }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth?.isAuthenticated) {
    // Not logged in → redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length && !allowedRoles.some(role => auth.user.roles.includes(role))) {
    // Logged in but not authorized → redirect to unauthorized page
    return <Navigate to="/401" replace />;
  }

  // Logged in and authorized → render children
  return children;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<MainLayout />}>
        {/* public route */}
        <Route index element={<Home />} />

        {/* auth routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* protected routes */}
        <Route
          path="profile"
          element={
            <Protected allowedRoles={["user", "admin", "moderator"]}>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="blogs"
          element={
            <Protected allowedRoles={["user", "admin", "moderator"]}>
              <Blogs />
            </Protected>
          }
        />
        <Route
          path="admin"
          element={
            <Protected allowedRoles={["admin"]}>
              <Admin />
            </Protected>
          }
        />
        <Route
          path="moderator"
          element={
            <Protected allowedRoles={["moderator"]}>
              <Moderator />
            </Protected>
          }
        />
        <Route
          path="lounge"
          element={
            <Protected allowedRoles={["admin", "moderator"]}>
              <Lounge />
            </Protected>
          }
        />

        <Route 
          path="/chat/:threadId?"
          element={
            <Protected allowedRoles={["user"]}>
              <ChatWindow />
            </Protected>
          }
        />

        {/* error routes*/}
        <Route path="/401" element={<UnAuth />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      

    </>
  )
);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App