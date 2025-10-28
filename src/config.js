// Centralized app configuration
// You can override these via Vite env: define VITE_API_BASE_URL in .env
// Dev: we can leave base URL empty and use relative '/api/...'(proxied by Vite)
// Prod: set to your real origin (e.g., https://app.floorida.site) in .env
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? '')
	// normalize: if it's just '/', treat as empty
	.replace(/^\/$/, '');

// Auth endpoint paths (relative to API_BASE_URL)
// Adjust these if your backend uses different routes
// Default paths per backend spec
export const AUTH_SIGNUP_PATH = import.meta.env?.VITE_AUTH_SIGNUP_PATH || '/api/auth/register';
export const AUTH_LOGIN_PATH = import.meta.env?.VITE_AUTH_LOGIN_PATH || '/api/auth/login';

// Storage keys
export const AUTH_TOKEN_KEY = 'auth:token';
export const AUTH_USER_KEY = 'auth:user';
