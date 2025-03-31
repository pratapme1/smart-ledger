// Use environment variable with fallback for development
const API_URL = process.env.REACT_APP_API_URL || "https://smart-ledger-production.up.railway.app";

export default API_URL;

// Export additional configuration values if needed
export const AUTH_CONFIG = {
  TOKEN_KEY: 'smart_ledger_auth_token',
  USER_KEY: 'smart_ledger_user'
};