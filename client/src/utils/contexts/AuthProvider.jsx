import { useEffect } from 'react';
import { createContext, useState, useMemo } from 'react';
import axios from '../axios';

export const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
      isAuthenticated: false,
      user: null
  });

  const [loading, setLoading] = useState(true);
  
  useEffect(()=>{
    (async () =>{
      try {
        const response = await axios.get("/authorize/me");
        setAuth(response.data);
      } catch (error) {
        console.error(error.stack);
        setAuth({
          isAuthenticated: false,
          user: null
        });
      } finally {
        // const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        // await wait(1000);
        setLoading(false); 
      }
    })();
  }, [])

  const value = useMemo(() => ({ auth, setAuth, loading }), [auth, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;