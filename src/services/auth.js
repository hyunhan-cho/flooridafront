import { http } from "./api.js";
import {
  AUTH_LOGIN_PATH,
  AUTH_SIGNUP_PATH,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
} from "../config.js";

// Normalizes various token response shapes
function extractToken(data) {
  if (!data) return null;
  return (
    data.token ||
    data.accessToken ||
    data.access_token ||
    (data.data && (data.data.token || data.data.accessToken)) ||
    null
  );
}

export async function signup({ email, password, username }) {
  const payload = { email, password, username };

  // ✅ 회원가입은 토큰 없이 진행해야 안전함
  const data = await http.post(AUTH_SIGNUP_PATH, payload, { skipAuth: true });

  return data;
}

export async function login({ email, password }) {
  const payload = { email, password };

  // ✅ 로그인 시도 전에 기존 토큰이 남아있으면 꼬일 수 있어서 제거(선택이지만 추천)
  localStorage.removeItem(AUTH_TOKEN_KEY);

  // ✅ 로그인도 토큰 없이 진행해야 안전함
  const data = await http.post(AUTH_LOGIN_PATH, payload, { skipAuth: true });

  // Save token if present
  const token = extractToken(data);
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  // Save minimal user profile if provided
  if (data && data.user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  }

  return data;
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
