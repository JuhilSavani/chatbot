import { fn, col, where } from "sequelize";
import { User } from "../models/user.models.js";
import { supabase } from "../clients/supabase.clients.js"

const IS_PROD = process.env.NODE_ENV !== "development";

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) 
    return res.status(400).json({
      message: "Please provide all registration details.",
    });

  try {    
    const existingUser = await User.findOne({
      where: where(fn("LOWER", col("username")), "=", username.toLowerCase()),
    });

    if (existingUser) 
      return res.status(409).json({ message: "Username already taken." });

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,   
      options: { emailRedirectTo: `${process.env.CLIENT_APP_ORIGIN_URL}/login` }
    });

    if (error || !data.user) 
      return res.status(400).json({ message: error.message || "Signup failed." });

    const newUser = await User.create({
      id: data.user.id,
      username: username.toLowerCase(),
      email
    });

    // Created
    res.status(201).json({ message: "User registered. Please verify your email." }); 
  } catch (error) {
    console.error(error.stack);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({
      message: "Please, provide complete credentials to login.",
    });
  try {
    const user = await User.findOne({
      where: where(fn("LOWER", col("username")), "=", username.toLowerCase()),
    });

    if (!user) 
      return res.status(404).json({ message: "User not found." });

    const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    
    if (error || !data.session) 
      return res.status(401).json({ message: "Invalid credentials." });

    if (!data.user?.email_confirmed_at) 
      return res.status(401).json({ message: "Please verify your email first." });
  
    res.cookie("authJwt", data.session?.access_token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "Strict" : "Lax",
      maxAge: 60 * 60 * 1000, // 60 min
    });

    return res.status(200).json({ 
      isAuthenticated: true,  
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt
      }, 
    }); 
  } catch (error) {
    console.error(error.stack);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

export const logout = (req, res) => {
  if (!req.cookies?.authJwt) return res.sendStatus(204); // No Content

  res.clearCookie("authJwt", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "Strict" : "Lax",
  });

  return res.sendStatus(200);
};
