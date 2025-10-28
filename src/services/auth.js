import { http } from './api.js'
import { AUTH_LOGIN_PATH, AUTH_SIGNUP_PATH, AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../config.js'

// Normalizes various token response shapes
function extractToken(data) {
  if (!data) return null
  return (
    data.token ||
    data.accessToken ||
    data.access_token ||
    (data.data && (data.data.token || data.data.accessToken)) ||
    null
  )
}

export async function signup({ email, password, username }) {
  const payload = { email, password, username }
  const data = await http.post(AUTH_SIGNUP_PATH, payload)
  return data
}

export async function login({ email, password }) {
  const payload = { email, password }
  const data = await http.post(AUTH_LOGIN_PATH, payload)
  // Save token if present
  const token = extractToken(data)
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
  // Save minimal user profile if provided
  if (data && data.user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
  }
  return data
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}
