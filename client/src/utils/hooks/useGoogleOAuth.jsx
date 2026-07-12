const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || "http://localhost:4000/api/authorize/google/callback";
const SCOPE = "openid email profile";

export const useGoogleOAuth = () => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    state: typeof window !== "undefined" ? window.location.origin : "",
  };
  
  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
};
