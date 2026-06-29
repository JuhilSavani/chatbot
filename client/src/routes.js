import { route, index, layout } from "@react-router/dev/routes";

export default [
  index("pages/LandingPage.jsx"),
  route("login", "pages/Login.jsx"),
  route("register", "pages/Register.jsx"),
  route("forgot-password", "pages/ForgotPassword.jsx"),
  route("reset-password", "pages/ResetPassword.jsx"),
  route("resend-verification", "pages/ResendVerification.jsx"),
  
  // Protected Routes
  layout("layouts/ProtectedLayout.jsx", [
    route("chat", "pages/ChatWindow.jsx", { id: "chat-index" }),
    route("chat/:threadId", "pages/ChatWindow.jsx", { id: "chat-thread" })
  ]),

  // Error Routes
  route("401", "pages/UnAuth.jsx"),
  route("*", "pages/NotFound.jsx"),
];
