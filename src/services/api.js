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

// 캘린더 완료 통계 API
export async function getCalendarStats(start, end) {
  return await http.get(`/api/floors/calendar?start=${start}&end=${end}`);
}

// 일정 단건 조회 API
export async function getSchedule(id) {
  return await http.get(`/api/schedules/${id}`);
}

// 일정 목록 조회 API (추정)
export async function getSchedules(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return await http.get(
    `/api/schedules${queryString ? `?${queryString}` : ""}`
  );
}
