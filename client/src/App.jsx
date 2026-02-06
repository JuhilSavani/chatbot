import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation } from "react-router-dom"
import ProtectedLayout from "./layouts/ProtectedLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnAuth from "./pages/UnAuth"
import NotFound from "./pages/NotFound";
import ChatWindow from "./pages/ChatWindow";
import AuthProvider from "./utils/contexts/AuthProvider";
import { useAuth } from "./utils/hooks/useAuth";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/">
        {/* public routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat/:threadId?" element={<ChatWindow />}/>
        </Route>

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