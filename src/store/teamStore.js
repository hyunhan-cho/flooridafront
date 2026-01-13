import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    getTeam,
    getTeamFloors,
    getTeamCharacters,
} from "../services/api.js";
import { getTeamMembersBadges } from "../services/badge.js";

/**
 * 팀 플레이스 전역 상태 저장소 (Persisted in LocalStorage)
 */

export const useTeamStore = create(
    persist(
        (set, get) => ({
            teamCache: {},

            // === Helpers ===
            // 캐시 유효성 체크 (예: 5분)
            isCacheValid: (teamId, key, duration = 5 * 60 * 1000) => {
                const { teamCache } = get();
                const cache = teamCache[teamId];
                if (!cache || !cache.lastFetched || !cache.lastFetched[key]) return false;
                return Date.now() - cache.lastFetched[key] < duration;
            },

            // 데이터 저장
            setTeamData: (teamId, key, data) => {
                set(state => {
                    const prevCache = state.teamCache[teamId] || { lastFetched: {} };
                    return {
                        teamCache: {
                            ...state.teamCache,
                            [teamId]: {
                                ...prevCache,
                                [key]: data,
                                lastFetched: {
                                    ...prevCache.lastFetched,
                                    [key]: Date.now()
                                }
                            }
                        }
                    };
                });
            },

            // === Actions ===

            // 팀 정보 로드
            fetchTeamInfo: async (teamId, force = false) => {
                if (!teamId) return null;
                if (!force && get().isCacheValid(teamId, 'info')) {
                    return get().teamCache[teamId].info;
                }

                try {
                    const data = await getTeam(teamId);
                    get().setTeamData(teamId, 'info', data);
                    return data;
                } catch (e) {
                    console.error("팀 정보 로드 실패", e);
                    throw e;
                }
            },

            // 팀 할 일 로드
            fetchTeamFloors: async (teamId, force = false) => {
                if (!teamId) return null;
                if (!force && get().isCacheValid(teamId, 'floors')) {
                    return get().teamCache[teamId].floors;
                }

                try {
                    const data = await getTeamFloors(teamId);
                    const floors = (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.floors))
                        ? data.floors
                        : (Array.isArray(data) ? data : []);

                    get().setTeamData(teamId, 'floors', floors);
                    return floors;
                } catch (e) {
                    console.error("팀 할 일 로드 실패", e);
                    throw e;
                }
            },

            // 팀 캐릭터 로드
            fetchTeamCharacters: async (teamId, force = false) => {
                if (!teamId) return null;
                if (!force && get().isCacheValid(teamId, 'characters')) {
                    return get().teamCache[teamId].characters;
                }

                try {
                    const res = await getTeamCharacters(teamId);
                    const chars = Array.isArray(res) ? res : [];

                    get().setTeamData(teamId, 'characters', chars);
                    return chars;
                } catch (e) {
                    console.error("팀 캐릭터 로드 실패", e);
                    get().setTeamData(teamId, 'characters', []);
                    return [];
                }
            },

            // 팀 뱃지 로드
            fetchTeamBadges: async (teamId, force = false) => {
                if (!teamId) return null;
                if (!force && get().isCacheValid(teamId, 'badges')) {
                    return get().teamCache[teamId].badges;
                }

                try {
                    const res = await getTeamMembersBadges(teamId);
                    const list = Array.isArray(res) ? res : res?.data ?? res?.result ?? res?.members ?? [];
                    const map = {};

                    list.forEach(m => {
                        const uid = m?.userId ?? m?.userid ?? m?.memberId;
                        if (uid == null) return;
                        const badgeList = m?.equippedBadges || m?.equipped || m?.badges || [];
                        const badge = badgeList.find(b => b?.equipped) ?? badgeList[0] ?? null;
                        if (badge) map[uid] = { ...badge, userId: uid };
                    });

                    get().setTeamData(teamId, 'badges', map);
                    return map;
                } catch (e) {
                    console.error("팀 뱃지 로드 실패", e);
                    get().setTeamData(teamId, 'badges', {});
                    return {};
                }
            },

            invalidateTeam: (teamId, key = null) => {
                set(state => {
                    if (!state.teamCache[teamId]) return state;

                    if (key) {
                        return {
                            teamCache: {
                                ...state.teamCache,
                                [teamId]: {
                                    ...state.teamCache[teamId],
                                    lastFetched: {
                                        ...state.teamCache[teamId].lastFetched,
                                        [key]: 0
                                    }
                                }
                            }
                        };
                    } else {
                        return {
                            teamCache: {
                                ...state.teamCache,
                                [teamId]: {
                                    ...state.teamCache[teamId],
                                    lastFetched: {}
                                }
                            }
                        };
                    }
                });
            }
        }),
        {
            name: "team-place-storage", // LocalStorage Key
            partialize: (state) => ({ teamCache: state.teamCache }), // teamCache만 저장
        }
    )
);
