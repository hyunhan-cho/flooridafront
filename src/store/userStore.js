// src/store/userStore.js
import { create } from "zustand";
import { getMyProfile } from "../services/profile.js";
import { getMyCharacter } from "../services/character.js";
import { getTodayFloors, getCalendarStats } from "../services/api.js";

/**
 * 유저 관련 전역 상태 저장소
 * - profile: 프로필 정보 (코인, 닉네임 등)
 * - character: 캐릭터 이미지 URL
 * - todayFloors: 오늘 할 일 목록
 * - calendarStats: 캘린더 통계 (진행률 등)
 */
export const useUserStore = create((set, get) => ({
    // === State ===
    profile: null,
    character: null,        // 기본 이미지 URL
    characterItems: [],     // 장착 아이템
    characterBadges: [],    // 장착 뱃지
    todayFloors: null,
    calendarStats: null,
    isLoading: false,
    lastFetchedAt: null, // 마지막 fetch 시간 (캐시 유효성 체크)

    // ✅ 아이템 메타데이터 (ID -> 정보 매핑용)
    itemMetadata: {},

    // === Actions ===

    // ... (기존 액션들 생략) ...

    // 아이템 메타데이터 로드 (상점 전체 목록 캐싱)
    fetchItemMetadata: async (force = false) => {
        const { itemMetadata } = get();
        // 이미 데이터가 있으면 스킵 (상점 데이터는 자주 안 바뀜)
        if (!force && Object.keys(itemMetadata).length > 0) {
            return itemMetadata;
        }

        try {
            // FACE, ACCESSORY 둘 다 조회
            const [faces, accessories] = await Promise.all([
                import("../services/store.js").then(m => m.getStoreItems("FACE")),
                import("../services/store.js").then(m => m.getStoreItems("ACCESSORY"))
            ]);

            const newMeta = { ...itemMetadata };

            // 배열을 객체(ID 기반)로 변환
            const processItems = (list) => {
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item.itemId) newMeta[item.itemId] = item;
                        if (item.id) newMeta[item.id] = item;
                    });
                }
            };

            // API 응답 구조 대응 (data.result or data)
            processItems(faces?.data?.result || faces?.data || faces || []);
            processItems(accessories?.data?.result || accessories?.data || accessories || []);

            set({ itemMetadata: newMeta });
            return newMeta;
        } catch (e) {
            console.error("아이템 메타 로드 실패:", e);
            return null;
        }
    },

    // 프로필 불러오기 ...

    // 프로필 불러오기 (캐시 있으면 스킵)
    fetchProfile: async (force = false) => {
        const { profile, lastFetchedAt } = get();
        const now = Date.now();

        // 5분 이내에 fetch한 적 있으면 스킵 (force가 아니면)
        if (!force && profile && lastFetchedAt && now - lastFetchedAt < 5 * 60 * 1000) {
            return profile;
        }

        try {
            const data = await getMyProfile();
            set({ profile: data, lastFetchedAt: now });
            return data;
        } catch (e) {
            console.error("프로필 로드 실패:", e);
            return null;
        }
    },

    // 캐릭터 불러오기 (캐시 있으면 스킵)
    fetchCharacter: async (force = false) => {
        const { character } = get();

        if (!force && character) {
            return character;
        }

        try {
            const data = await getMyCharacter();
            const imageUrl = data?.imageUrl ?? data?.data?.imageUrl ?? null;
            set({ character: imageUrl });
            return imageUrl;
        } catch (e) {
            console.error("캐릭터 로드 실패:", e);
            return null;
        }
    },

    // 오늘의 할 일 불러오기
    fetchTodayFloors: async (force = false) => {
        const { todayFloors, lastFetchedAt } = get();
        const now = Date.now();

        // 1분 이내에 fetch한 적 있으면 스킵
        if (!force && todayFloors && lastFetchedAt && now - lastFetchedAt < 60 * 1000) {
            return todayFloors;
        }

        try {
            set({ isLoading: true });
            const data = await getTodayFloors();
            set({ todayFloors: data, lastFetchedAt: now, isLoading: false });
            return data;
        } catch (e) {
            console.error("오늘 할 일 로드 실패:", e);
            set({ isLoading: false });
            return null;
        }
    },

    // 캘린더 통계 불러오기
    fetchCalendarStats: async (year, month, force = false) => {
        const { calendarStats } = get();

        if (!force && calendarStats) {
            return calendarStats;
        }

        try {
            const data = await getCalendarStats(year, month);
            set({ calendarStats: data });
            return data;
        } catch (e) {
            console.error("캘린더 통계 로드 실패:", e);
            return null;
        }
    },

    // 모든 초기 데이터 한번에 불러오기
    fetchInitialData: async () => {
        set({ isLoading: true });

        try {
            const [profile, character, todayFloors] = await Promise.all([
                get().fetchProfile(),
                get().fetchCharacter(),
                get().fetchTodayFloors(),
            ]);

            set({ isLoading: false });
            return { profile, character, todayFloors };
        } catch (e) {
            console.error("초기 데이터 로드 실패:", e);
            set({ isLoading: false });
            return null;
        }
    },

    // 프로필 업데이트 (로컬 상태만)
    setProfile: (profile) => set({ profile }),

    // 캐릭터 업데이트 (로컬 상태만)
    setCharacter: (character) => set({ character }),

    // 코인 업데이트
    updateCoins: (coins) => set((state) => ({
        profile: state.profile ? { ...state.profile, coin: coins } : null
    })),

    // 상태 초기화 (로그아웃 시)
    reset: () => set({
        profile: null,
        character: null,
        todayFloors: null,
        calendarStats: null,
        isLoading: false,
        lastFetchedAt: null,
    }),
}));
