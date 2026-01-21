import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form";
import { useAuth } from "../utils/hooks/useAuth";
import { loginAction } from "../utils/actions/authorize.actions";
import { useGoogleOAuth } from "../utils/hooks/useGoogleOAuth";

function Login() {
  const [loginError, setLoginError] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleOAuthUrl = useGoogleOAuth();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const location = useLocation();
  const navigate = useNavigate();

  const { setAuth } = useAuth();
 
  const from = location.state?.from?.pathname || "/";

  const usernameField = register("username", {
    required: "Username is required"
  });

  const passwordField = register("password", {
    required: "Password is required"
  })

  const onSubmit = async (data) => {
    setLoading(true);
    try{
      const result = await loginAction(data);
      if(result.error) setLoginError(result.error);
      else{
        setAuth(result);
        setLoginError(null);
        navigate(from, { replace: true });
      }
    }finally{
      setLoading(false); 
    }
  }

  return (
    <div className="login page">
      <div className="container">
        {loginError && <span className="error">{loginError}</span>}
        <h1>Login</h1>
        <p>Please enter your credentials to log in.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ul>
          <li>
            <input type="text" {...usernameField} placeholder="Username" />
            {errors.username && <span className="error">{errors.username.message}</span>}
          </li>
          <li>
            <input type="password" {...passwordField} placeholder="Password" />
            {errors.password && <span className="error">{errors.password.message}</span>}
          </li>
          <li>
            <button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="m-auto w-9 h-9 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                </>
              ) : (
                "Login"
              )}
          </button>
          </li>
          <li><span>Or log in with <Link to={googleOAuthUrl}>Google</Link></span></li>
          <li><span>Don't have an account? <Link to="/register">Register</Link></span></li>
        </ul>
        </form>
      </div>
    </div>
  )
}

export default Login