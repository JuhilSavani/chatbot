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

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<MainLayout />}>
        {/* public route */}
        <Route index element={<Navigate to="/chat" replace />} />

        {/* auth routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* protected routes */}
        <Route path="/chat/:threadId?" element={<ChatWindow />}/>

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