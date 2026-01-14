import axios from "../axios";
import { useAuth } from "./useAuth";
import { useState } from "react";

function useLogout() {
  const [logoutError, setLogoutError] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { setAuth } = useAuth();

  const logout = async () => {
    setLogoutLoading(true);
    setLogoutError(null);
    try {
      await axios.post("/authorize/logout", { withCredentials: true });
      setAuth({
        isAuthenticated: false,
        user: null
      });
    } catch (error) {
      console.error(error.stack);
      setLogoutError("Logout failed. Please try again.");
    }finally {
      setLogoutLoading(false);
    }
  };
  return { logout, logoutError, logoutLoading };
}

export default useLogout;