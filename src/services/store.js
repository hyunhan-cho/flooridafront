// src/services/store.js
import { http } from "./api.js";

export async function getMyCharacter() {
  return await http.get("/api/characters/me");
}

// ✅ 상점 아이템 조회: GET /api/items?type=FACE | ACCESSORY
export async function getStoreItems(type) {
  // http.get은 이미 JSON 파싱 결과를 반환함
  return await http.get(`/api/items?type=${encodeURIComponent(type)}`);
}

// ✅ 구매: POST /api/items/{itemId}/purchase
export async function purchaseItem(itemId) {
  return await http.post(`/api/items/${itemId}/purchase`, {});
}

// ✅ 장착: POST /api/items/{itemId}/equip
export async function equipItem(itemId) {
  return await http.post(`/api/items/${itemId}/equip`, {});
}

// ✅ 해제: POST /api/items/{itemId}/unequip
export async function unequipItem(itemId) {
  return await http.post(`/api/items/${itemId}/unequip`, {});
}

// 내가 보유한 아이템 조회
export async function getMyItems() {
  return await http.get("/api/items/my");
}

// 내가 장착한 아이템 조회
export async function getMyEquippedItems() {
  return await http.get("/api/items/my/equipped");
}
