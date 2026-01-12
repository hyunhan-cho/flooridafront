// src/services/teamBoard.js
import { http } from "./api.js";

// ✅ Swagger 기준: /teams/{teamId}/boards (앞에 /api 없음)
const PATH_PREFIX = ""; // 절대 "/api" 붙이지 말기

const p = (path) => `${PATH_PREFIX}${path}`;

// 목록
export async function getTeamBoards(teamId) {
  return await http.get(p(`/teams/${teamId}/boards`));
}

// 작성 (body: { content })
export async function createTeamBoard(teamId, body) {
  return await http.post(p(`/teams/${teamId}/boards`), body);
}

// 단건
export async function getTeamBoard(teamId, boardId) {
  return await http.get(p(`/teams/${teamId}/boards/${boardId}`));
}

// 좋아요 토글
export async function toggleTeamBoardLike(teamId, boardId) {
  return await http.post(p(`/teams/${teamId}/boards/${boardId}/likes`), {});
}

// 댓글 목록
export async function getTeamBoardComments(teamId, boardId) {
  return await http.get(p(`/teams/${teamId}/boards/${boardId}/comments`));
}

// 댓글 작성 (body: { content })
export async function createTeamBoardComment(teamId, boardId, body) {
  return await http.post(
    p(`/teams/${teamId}/boards/${boardId}/comments`),
    body
  );
}
