export function handleAxiosError(error, defaultMessage) {
  if (error.response) { // Server responded with status != 2xx
    // We prioritize the server's specific error message if it exists
    const serverMessage = error.response.data?.message || error.response.data?.error;
    return { error: serverMessage || defaultMessage };
  }

  if (error.request) // Request made but no response
    return { error: "No response from server. Please check your connection." };
  
  // Something else (network error, setup error, etc.)
  return { error: defaultMessage };
}