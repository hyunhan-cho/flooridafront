import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";

function buildHeaders(extra) {
  const headers = new Headers({ "Content-Type": "application/json", ...extra });
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function request(
  path,
  { method = "GET", body, headers, signal } = {}
) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL.replace(/\/$/, "")}${path}`;

  const res = await fetch(url, {
    method,
    headers: buildHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
    // include credentials only if your API needs cookies
    // credentials: 'include',
    signal,
  });

  // Try to parse JSON safely
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) =>
    request(path, { ...opts, method: "PATCH", body }),
  del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

// 캐릭터 API
export async function getMyCharacter() {
  return await http.get("/api/characters/me");
}

// 뱃지 목록 조회 API
export async function getMyBadges() {
  return await http.get("/api/me/badges");
}

// 닉네임 조회 API
export async function getMyUsername() {
  return await http.get("/api/me/username");
}

// 닉네임 업데이트 API
export async function updateUsername(username) {
  return await http.patch("/api/me/username", { username });
}

// 캘린더 완료 통계 API
export async function getCalendarStats(start, end) {
  return await http.get(`/api/floors/calendar?start=${start}&end=${end}`);
}

// 일정 단건 조회 API
export async function getSchedule(id) {
  return await http.get(`/api/schedules/${id}`);
}

// 월간 일정 목록 조회
// GET /api/floors/calendar/month?year=2025&month=11
export function getSchedules({ year, month }) {
  return http.get(
    `/api/floors/calendar/month?year=${encodeURIComponent(
      year
    )}&month=${encodeURIComponent(month)}`
  );
}

// 개인 플랜 미달성 일정 조회
// GET /api/me/personal-place/missed
export async function getMissedPersonalPlace() {
  return await http.get("/api/me/personal-place/missed");
}

// 특정 날짜의 Floor 상태 조회
// GET /api/floors/status/date/{date}
export async function getFloorsStatusByDate(date) {
  return await http.get(`/api/floors/status/date/${date}`);
}

// 일정 삭제 API
// DELETE /api/schedules/{id}
export async function deleteSchedule(id) {
  return await http.del(`/api/schedules/${id}`);
}

// Floor 삭제 API
// DELETE /api/floors/{id}
export async function deleteFloor(id) {
  return await http.del(`/api/floors/${id}`);
}

// 오늘 할 일 불러오기
// GET /api/floors/today
export async function getTodayFloors() {
  return await http.get("/api/floors/today");
}

// Floor 완료 처리 API
// POST /api/floors/{floorId}/complete
// 10코인 지급, 층수(personalLevel) 1 증가
export async function completeFloor(floorId) {
  // 빈 body 또는 필요한 데이터를 포함하여 요청
  return await http.post(`/api/floors/${floorId}/complete`, {});
}

// Floor 완료 취소 API
// POST /api/floors/{floorId}/uncomplete
// 10코인 차감, 층수(personalLevel) -1 (최소 1층 유지)
export async function uncompleteFloor(floorId) {
  return await http.post(`/api/floors/${floorId}/uncomplete`, {});
}

// 사용자 프로필 조회 API
// GET /api/me/profile
// personalLevel 필드 포함
export async function getMyProfile() {
  return await http.get("/api/me/profile");
}

// Floor 완료 상태 업데이트 API (하위 호환성을 위해 유지)
// 이제는 completeFloor를 사용하지만, 기존 코드와의 호환성을 위해 유지
export async function updateFloorCompletion(
  floorId,
  completed,
  scheduleId = null
) {
  if (completed) {
    // 완료 처리
    return await completeFloor(floorId);
  } else {
    // 미완료 처리 (필요한 경우 별도 API 구현)
    console.warn("미완료 처리 API는 아직 구현되지 않았습니다.");
    return;
  }
}

// Schedule 부분 수정 API
// PATCH /api/schedules/{id}
export async function updateSchedule(id, data) {
  return await http.patch(`/api/schedules/${id}`, data);
}

// Floor 수정 API
// PATCH /api/floors/{id}
export async function updateFloor(id, data) {
  return await http.patch(`/api/floors/${id}`, data);
}

// 테스트용: 층수 추가
export async function addTestFloors(floors = 100) {
  return http.post(`/api/me/test/add-floors?floors=${floors}`, {});
}

// Schedule 부분 수정 API
// PATCH /api/schedules/{id}
export async function updateSchedule(id, data) {
  return await http.patch(`/api/schedules/${id}`, data);
}

// Floor 수정 API
// PATCH /api/floors/{id}
export async function updateFloor(id, data) {
  return await http.patch(`/api/floors/${id}`, data);
}

// Floor 추가 API
// POST /api/floors
// Body: { scheduleId, title, scheduledDate }
export async function createFloor(data) {
  return await http.post(`/api/floors`, data);
}
