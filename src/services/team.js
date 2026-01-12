// src/services/team.js
import { http } from "./api.js";

/**
 * GET /api/teams - 내 팀 목록 조회
 */
export async function getTeams() {
  return await http.get("/api/teams");
}

/**
 * POST /api/teams - 팀 생성
 * (Swagger 기준) body: { name, startDate, endDate }
 * 응답: teamId, joinCode 등이 올 수 있음(키는 백엔드에 따라 다를 수 있어 fallback 처리 필요)
 */
export async function createTeam({ name, startDate, endDate }) {
  if (!name) throw new Error("name is required");
  if (!startDate) throw new Error("startDate is required");
  if (!endDate) throw new Error("endDate is required");
  return await http.post("/api/teams", { name, startDate, endDate });
}

/**
 * POST /api/teams/join - 팀 가입(초대코드)
 * Swagger request body: { "joinCode": "string" }
 */
export async function joinTeam(joinCode) {
  if (!joinCode) throw new Error("joinCode is required");
  return await http.post("/api/teams/join", { joinCode });
}

/**
 * GET /api/teams/{teamId} - 팀 단건 조회
 */
export async function getTeam(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}`);
}

/**
 * GET /api/items/{teamId}/characters - 팀원 캐릭터(장착 상태) 조회
 */
// src/services/team.js
export async function getTeamCharacters(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/items/${teamId}/characters`);
}
