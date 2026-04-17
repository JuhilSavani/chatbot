import axios from "../axios"

export async function registerAction(data){
  try{
    const response = await axios.post("/authorize/register", data);
    return response.data;
  }catch(error){
    console.error(error.stack);
    if(error.response) // Server responded with status != 2xx
      return { error: error.response.data?.message || "Registration failed!" };
    
    if(error.request) // Request made but no response
      return { error: "No response from server!" };
    
    // Something else (network error, setup error, etc.)
    return { error: "Oops! Something went wrong!" };
  }
}

export async function loginAction(data){
  try{
    const response = await axios.post("/authorize/login", data);
    return response.data;
  }catch(error){
    console.error(error.stack);
    if(error.response) // Server responded with status != 2xx
      return { error: error.response.data?.message || "Login failed!" };

    if(error.request) // Request made but no response
      return { error: "No response from server!" };

    // Something else (network error, setup error, etc.)
    return { error: "Oops! Something went wrong!" };
  }
}

export async function forgotPasswordAction({ identifier }) {
  try {
    const response = await axios.post("/authorize/forgot-password", { identifier });
    return response.data;
  } catch (error) {
    console.error(error.stack);
    if (error.response)
      return { error: error.response.data?.message || "Failed to send reset link!" };
    if (error.request)
      return { error: "No response from server!" };
    return { error: "Oops! Something went wrong!" };
  }
}

export async function resetPasswordAction(data) {
  try {
    const response = await axios.post("/authorize/reset-password", data);
    return response.data;
  } catch (error) {
    console.error(error.stack);
    if (error.response)
      return { error: error.response.data?.message || "Failed to reset password!" };
    if (error.request)
      return { error: "No response from server!" };
    return { error: "Oops! Something went wrong!" };
  }
}