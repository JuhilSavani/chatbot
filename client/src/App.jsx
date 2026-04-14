import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation } from "react-router-dom"
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnAuth from "./pages/UnAuth"
import NotFound from "./pages/NotFound";
import ChatWindow from "./pages/ChatWindow";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthProvider from "./utils/contexts/AuthProvider";
import LandingPage from "./pages/LandingPage";
import Loading from "./pages/Loading";
import { useAuth } from "./utils/hooks/useAuth";

const Protected = ({ children }) => {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;

  // Redirect if NOT authenticated
  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
    
  // Render the specific component passed inside the tags
  return children;
};


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/">
        {/* public routes */}
        <Route index element={<LandingPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route 
          path="chat/:threadId?" 
          element={
            <Protected>
              <ChatWindow />
            </Protected>
          } 
        />

        {/* error routes*/}
        <Route path="401" element={<UnAuth />} />
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