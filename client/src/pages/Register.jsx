import { useState } from "react";
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form";
import { registerAction } from "@/utils/actions/authorize.actions";
import { useGoogleOAuth } from "@/utils/hooks/useGoogleOAuth";

function Register() {
  const [registerError, setRegisterError] = useState(null);
  const [registerMessage, setRegisterMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleOAuthUrl = useGoogleOAuth();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const usernameField = register("username", {
    required: "Username is required",
    minLength: {
      value: 3,
      message: "Username must be at least 3 characters long"
    }
  });

  const emailField = register("email", {
    required: "Email is required",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Invalid email address"
    }
  });
  
  const passwordField = register("password", {
    required: "Password is required",
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?]).{8,}$/,
      message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
     try{
      const result = await registerAction(data);
      if(result.error) setRegisterError(result.error);
      else{
        setRegisterMessage(result.message);
        setRegisterError(null);
      }
     }finally{
      setLoading(false); 
    }
  }

  return (
    <div className="register page">
      <div className="container">
        {registerError && <span className="error">{registerError}</span>}
        {registerMessage && <span className="message">{registerMessage}</span>}
        <h1>Register</h1>
        <p>Fill in your details to create a new account.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ul>
            <li>
              <input type="text" {...usernameField} placeholder="Username" />
              {errors.username && <span className="error">{errors.username.message}</span>}
            </li>
            <li>
              <input type="email" {...emailField} placeholder="Email" />
              {errors.email && <span className="error">{errors.email.message}</span>}
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
                  "Register"
                )}
              </button>
            </li>
            <li><span>Or register with <Link to={googleOAuthUrl}>Google</Link></span></li>
            <li><span>Already have an account? <Link to="/login">Login</Link></span></li>
          </ul>
        </form>
      </div>
    </div>
  )
}

export default Register