// src/services/character.js
import { http } from "./api.js";

// ✅ 내 캐릭터(기본/베이스 이미지 URL): GET /api/characters/me
export async function getMyCharacter() {
  return await http.get("/api/characters/me");
}

// ✅ 장착 아이템 조회
export async function getEquippedItems() {
  return await http.get("/api/items/equipped/items");
}

// ✅ 장착 뱃지 조회
export async function getEquippedBadges() {
  return await http.get("/api/items/equipped/badges");
}
