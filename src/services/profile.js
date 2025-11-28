// src/services/profile.js
import { http } from "./api.js";

const PROFILE_PATH = "/api/me/profile";

export function getMyProfile() {
  return http.get(PROFILE_PATH);
}
