// src/services/tendency.js
import { http } from "./api.js";

const ONBOARDING_PATH = "/api/me/onboarding";

/**
 * 온보딩 정보 저장 API
 */
export function saveTendency({ planningTendency, dailyStudyHours }) {
  return http.post(ONBOARDING_PATH, {
    planningTendency,
    dailyStudyHours,
  });
}
