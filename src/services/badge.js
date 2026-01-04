// src/services/badge.js
import { http } from "./api.js";

// ✅ 내 뱃지 목록 조회: GET /api/me/badges
export async function getMyBadges() {
  const data = await http.get("/api/me/badges");

  // 네트워크 레벨 덤프
  console.log("🧪 [API] GET /api/me/badges parsed data:", data);

  // http.get은 이미 "data"를 리턴하므로 그대로 반환하면 됨
  return data;
}
