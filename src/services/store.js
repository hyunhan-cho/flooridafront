// src/services/store.js
import { http } from "./api.js";

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

// ✅ 내 아이템 목록: GET /api/me/items
export async function getMyItems() {
  return await http.get(`/api/me/items`);
}

// ✅ 내 장착 아이템 목록: GET /api/me/items/equipped
export async function getMyEquippedItems() {
  return await http.get(`/api/me/items/equipped`);
}
