// src/services/badge.js
import { http } from "./api.js";

// ✅ 내 뱃지 목록(있으면 유지): GET /api/me/badges
export async function getMyBadges() {
  return await http.get("/api/me/badges");
}

// ✅ 내 뱃지 + 연속출석 요약: GET /api/me/badges/summary
export async function getMyBadgesSummary() {
  return await http.get("/api/me/badges/summary");
}

// ✅ 현재 장착중인 뱃지 목록: GET /api/me/badges/equipped
export async function getMyEquippedBadges() {
  return await http.get("/api/me/badges/equipped");
}

// ✅ 뱃지 장착: POST /api/me/badges/{badgeId}/equip
export async function equipBadge(badgeId) {
  return await http.post(`/api/me/badges/${badgeId}/equip`, {});
}

// ✅ 뱃지 해제: POST /api/me/badges/{badgeId}/unequip
export async function unequipBadge(badgeId) {
  return await http.post(`/api/me/badges/${badgeId}/unequip`, {});
}

// ✅ 팀원 뱃지 상태 조회: GET /api/badges/team/{teamId}/members
export async function getTeamMembersBadges(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/badges/team/${teamId}/members`);
}
