import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation } from "react-router-dom"
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnAuth from "./pages/UnAuth"
import NotFound from "./pages/NotFound";
import ChatWindow from "./pages/ChatWindow";
import AuthProvider from "./utils/contexts/AuthProvider";
import { useAuth } from "./utils/hooks/useAuth";

// Protected wrapper
function Protected({ children }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth?.isAuthenticated) {
    // Not logged in → redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in (and we don't check roles anymore) → render children
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
          path="/chat/:threadId?"
          element={
            <Protected>
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