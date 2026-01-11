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

export default http;

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
  return await http.get(
    `/api/floors/calendar/weekly-rates?start=${start}&end=${end}`
  );
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
// Floor 완료 상태 업데이트 API (백엔드 엔드포인트 미구현으로 일단 더미 처리)
// 현재 백엔드 스펙에는 PATCH /api/floors/{id} 가 없어 404가 발생하므로
// 일단 프론트엔드에서만 상태를 유지하고, 서버 호출은 하지 않습니다.
export async function updateFloorCompletion(
  floorId,
  completed,
  scheduleId = null
) {
  console.warn(
    "updateFloorCompletion: 백엔드에 완료 상태를 저장하는 엔드포인트가 없어,",
    "프론트엔드에서만 상태를 변경합니다.",
    { floorId, completed, scheduleId }
  );
  return;
}

// Floor 추가 API
// POST /api/floors
// Body: { scheduleId, title, scheduledDate }
export async function createFloor(data) {
  return await http.post(`/api/floors`, data);
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
// 팀플레이스 팀 목록 조회
export async function getTeams() {
  return await http.get("/api/teams");
}
//* ✅ 팀 멤버(유저명 포함) 조회
// * GET /api/items/{teamId}/characters
// * 응답 예시:
// * [
// *   { userId, username, equippedItems: [...] }
// * ]
// */
export async function getTeamCharacters(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/items/${teamId}/characters`);
}
// 팀 단건 조회 (myRole 확인용)
export async function getTeam(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}`);
}

// 팀 멤버 목록 조회
// GET /api/teams/{teamId}/members
export async function getTeamMembers(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}/members`);
}
// 팀 멤버 퇴출
// DELETE /api/teams/{teamId}/members/{targetUserId}
export async function removeTeamMember(teamId, targetUserId) {
  if (teamId == null) throw new Error("teamId is required");
  if (targetUserId == null) throw new Error("targetUserId is required");
  return await http.del(`/api/teams/${teamId}/members/${targetUserId}`);
}

// 팀 나가기
// DELETE /api/teams/{teamId}/leave
export async function leaveTeam(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.del(`/api/teams/${teamId}/leave`);
}
// 팀 폭파(방 폭파)
// DELETE /api/teams/{teamId}
// body: { password: "string" }
export async function deleteTeam(teamId, password) {
  if (teamId == null) throw new Error("teamId is required");
  if (!password) throw new Error("password is required");

  // http.del은 body를 못 받으니까 request 직접 호출
  return await request(`/api/teams/${teamId}`, {
    method: "DELETE",
    body: { password },
  });
}
// 팀 할 일 목록 조회
// GET /api/teams/{teamId}/floors
export async function getTeamFloors(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}/floors`);
}

// 팀 할 일 완료
// post /api/teams/floors/{teamfloorId}/complete
export async function completeTeamFloor(teamFloorId) {
  if (teamFloorId == null) throw new Error("teamFloorId is required");
  return await http.post(`/api/teams/floors/${teamFloorId}/complete`, {});
}
// 팀 할 일 완료 취소
//post /api/teams/floors/{teamfloorId}/cancel
export async function cancelTeamFloor(teamFloorId) {
  if (teamFloorId == null) throw new Error("teamFloorId is required");
  return await http.post(`/api/teams/floors/${teamFloorId}/cancel`, {});
}
