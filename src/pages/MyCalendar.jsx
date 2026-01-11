// pages/MyCalendar.jsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import AiPlanFormNew from "./mycalendar/AiPlanFormNew.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";
import DirectAddForm from "./mycalendar/DirectAddForm.jsx";
import CalendarView from "../components/CalendarView.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import editIcon from "../assets/img/Vector.png";
import {
  getSchedules,
  getSchedule,
  getFloorsStatusByDate,
  deleteSchedule,
  updateFloorCompletion,
  updateFloor,
  deleteFloor,
  createFloor,
  updateSchedule,
} from "../services/api.js";

// AI 호출 실패했을 때 임시로 보여줄 더미 일정
function buildFallbackSchedule({ goal, startDate, endDate }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return {
      scheduleId: -1,
      title: goal || "AI 플랜",
      startDate: today.toISOString().slice(0, 10),
      endDate: tomorrow.toISOString().slice(0, 10),
      color: "#FDBA74",
      teamId: null,
      floors: [],
    };
  }

  const days =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const steps = Math.min(8, Math.max(3, Math.round(days / 2)));
  const floors = [];
  for (let i = 0; i < steps; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + Math.floor((days * i) / steps));
    floors.push({
      floorId: i + 1,
      title: `${i + 1}단계: ${goal || "계획"}`,
      scheduledDate: d.toISOString().slice(0, 10),
    });
  }

  return {
    scheduleId: -1,
    title: goal || "AI 플랜",
    startDate,
    endDate,
    color: "#FDBA74",
    teamId: null,
    floors,
  };
}

export default function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date()); //
  const [showAiPlanForm, setShowAiPlanForm] = useState(false);
  const [aiPlanStep, setAiPlanStep] = useState("form"); // "form" | "loading" | "result"
  const [schedule, setSchedule] = useState(null);
  const [showDirectAddForm, setShowDirectAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // 선택된 날짜
  const [selectedTask, setSelectedTask] = useState(null); // 선택된 작업
  const [editingTask, setEditingTask] = useState(null); // 수정 중인 작업
  const [editingFloor, setEditingFloor] = useState(null); // 편집 중인 floor (id)
  const [editingFloorText, setEditingFloorText] = useState(""); // 편집 중인 floor의 텍스트

  // 2. tasks를 상태(State)로 선언해야 화면이 업데이트됩니다.
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 선택된 날짜의 할 일 불러오기 (모든 floors를 가져온 후 날짜에 맞는 것만 필터링)
  const loadTasksForDate = async (date) => {
    // 항상 loadTasks를 사용해서 모든 floors를 가져옴
    await loadTasks();
  };

  // API에서 일정 목록 불러오기
  const loadTasks = async (targetDate = null) => {
    const dateToUse = targetDate || new Date();
    const year = dateToUse.getFullYear();
    const month = dateToUse.getMonth() + 1;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getSchedules({ year, month });
      console.log("API 응답 데이터:", data);

      if (Array.isArray(data) && data.length > 0) {
        // 메인 계획(schedule) 순서 보존을 위해 scheduleId 기준으로 정렬
        // DB 조회 순서가 변경될 수 있으므로 클라이언트에서 일관된 정렬 적용
        const sortedSchedules = [...data].sort((a, b) => {
          // scheduleId 기준으로 오름차순 정렬 (일관된 순서 유지)
          const idA = a.scheduleId || 0;
          const idB = b.scheduleId || 0;
          return idA - idB;
        });

        // 각 일정의 floors를 가져오기 위해 getSchedule API 호출
        const convertedTasks = await Promise.all(
          sortedSchedules.map(async (schedule) => {
            let floors = schedule.floors || [];

            // floors가 없거나 비어있으면 getSchedule로 상세 정보 가져오기
            if (!floors || floors.length === 0) {
              try {
                const detail = await getSchedule(schedule.scheduleId);
                floors = detail.floors || [];
                console.log(
                  `Schedule ${schedule.scheduleId} 상세 정보:`,
                  detail
                );
              } catch (err) {
                console.warn(
                  `Schedule ${schedule.scheduleId} 상세 정보 로드 실패:`,
                  err
                );
                floors = [];
              }
            }

            // API 응답의 floors를 scheduledDate 및 floorId 기준으로 정렬
            // DB 조회 순서가 변경될 수 있으므로 클라이언트에서 정렬 처리
            const subtasksUnordered = floors.map((floor, index) => ({
              id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
              floorId: floor.floorId, // API 호출을 위해 floorId 저장
              scheduleId: schedule.scheduleId, // API 호출을 위해 scheduleId 저장
              text: floor.title || `단계 ${index + 1}`,
              done: floor.completed || false,
              scheduledDate: floor.scheduledDate || floor.date, // 날짜 정보 보존 (나중에 이전 상태와 병합)
            }));

            // scheduledDate 및 floorId 기준으로 정렬
            // 1순위: scheduledDate (날짜 순서)
            // 2순위: floorId (같은 날짜 내에서 순서)
            const subtasks = [...subtasksUnordered].sort((a, b) => {
              // scheduledDate 비교
              const dateA = a.scheduledDate || "";
              const dateB = b.scheduledDate || "";

              if (dateA !== dateB) {
                return dateA.localeCompare(dateB); // 날짜 오름차순 정렬
              }

              // scheduledDate가 같으면 floorId로 정렬
              const idA = a.floorId || a.id || "";
              const idB = b.floorId || b.id || "";

              // floorId가 숫자면 숫자로 비교, 아니면 문자열로 비교
              const numA = parseInt(idA);
              const numB = parseInt(idB);

              if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB; // 숫자 오름차순
              }

              return idA.localeCompare(idB); // 문자열 오름차순
            });

            // localStorage에서 임시 저장된 floor 추가 (새로 추가된 floor)
            try {
              const storageKey = `temp_floors_${schedule.scheduleId}`;
              const tempFloors = JSON.parse(
                localStorage.getItem(storageKey) || "[]"
              );
              for (const tempFloor of tempFloors) {
                // 이미 존재하는지 확인 (중복 방지)
                const exists = subtasks.some(
                  (s) => s.id === tempFloor.id || s.floorId === tempFloor.id
                );
                if (!exists) {
                  subtasks.push({
                    id: tempFloor.id,
                    floorId: tempFloor.id,
                    scheduleId: tempFloor.scheduleId,
                    text: tempFloor.title,
                    done: tempFloor.completed || false,
                    scheduledDate: tempFloor.scheduledDate,
                    isNew: false, // 이미 저장된 것으로 표시
                  });
                }
              }

              // localStorage에서 추가한 후에도 정렬 적용
              subtasks.sort((a, b) => {
                // scheduledDate 비교 (1순위)
                const dateA = a.scheduledDate || "";
                const dateB = b.scheduledDate || "";

                if (dateA !== dateB) {
                  return dateA.localeCompare(dateB); // 날짜 오름차순 정렬
                }

                // scheduledDate가 같으면 floorId로 정렬 (2순위)
                const idA = a.floorId || a.id || "";
                const idB = b.floorId || b.id || "";

                // floorId가 숫자면 숫자로 비교, 아니면 문자열로 비교
                const numA = parseInt(idA);
                const numB = parseInt(idB);

                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB; // 숫자 오름차순
                }

                return idA.localeCompare(idB); // 문자열 오름차순
              });
            } catch (error) {
              console.error("localStorage에서 임시 floor 로드 실패:", error);
            }

            // 완료된 subtask 개수 계산
            const doneCount = subtasks.filter((s) => s.done).length;

            return {
              id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
              title: schedule.title || "제목 없음",
              progress: `${doneCount}/${subtasks.length}`,
              subtasks,
              color: schedule.color || "#3a8284",
              startDate: schedule.startDate,
              endDate: schedule.endDate,
            };
          })
        );

        console.log("변환된 tasks:", convertedTasks);

        // 기존 tasks의 순서와 scheduledDate를 보존하여 메인 계획 순서 유지 및 날짜 변경 방지
        setTasks((prevTasks) => {
          // 기존 tasks의 순서를 유지하기 위한 맵 생성 (scheduleId 기준)
          const taskOrderMap = new Map();
          prevTasks.forEach((task, index) => {
            const scheduleId = task.id; // task.id는 scheduleId의 문자열
            if (scheduleId) {
              taskOrderMap.set(scheduleId, index);
            }
          });

          // floorId를 키로 하는 기존 날짜 맵 생성 (더 정확한 매칭)
          const scheduledDateMap = new Map();
          prevTasks.forEach((task) => {
            task.subtasks.forEach((subtask) => {
              if (subtask.floorId && subtask.scheduledDate) {
                scheduledDateMap.set(subtask.floorId, subtask.scheduledDate);
              }
              // id도 키로 저장 (floorId가 없는 경우 대비)
              if (subtask.id && subtask.scheduledDate && !subtask.floorId) {
                scheduledDateMap.set(subtask.id, subtask.scheduledDate);
              }
            });
          });

          // 기존 순서를 유지하면서 convertedTasks 정렬
          const sortedConvertedTasks = [...convertedTasks].sort((a, b) => {
            const orderA = taskOrderMap.get(a.id) ?? 9999; // 기존에 있던 것은 원래 순서 유지
            const orderB = taskOrderMap.get(b.id) ?? 9999;
            if (orderA !== orderB) {
              return orderA - orderB; // 기존 순서 유지
            }
            // 기존에 없던 새로운 task는 scheduleId로 정렬 (일관된 순서)
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idA - idB;
          });

          return sortedConvertedTasks.map((newTask) => {
            // 기존 subtasks의 scheduledDate를 보존
            let updatedSubtasks = newTask.subtasks.map((newSubtask) => {
              // 1. 기존 상태에서 찾기 (prevTasks)
              let preservedDate = scheduledDateMap.get(newSubtask.floorId);
              if (!preservedDate && newSubtask.id) {
                preservedDate = scheduledDateMap.get(newSubtask.id);
              }

              // 2. localStorage에서 찾기 (더 확실한 보존)
              if (!preservedDate && newSubtask.floorId) {
                try {
                  const scheduledDateKey = `floor_scheduledDate_${newSubtask.floorId}`;
                  const storedDate = localStorage.getItem(scheduledDateKey);
                  if (storedDate) {
                    preservedDate = storedDate;
                  }
                } catch (err) {
                  // localStorage 접근 실패 시 무시
                }
              }

              // 3. 기존 날짜가 있으면 우선 사용 (절대 날짜 변경 방지)
              if (preservedDate) {
                return {
                  ...newSubtask,
                  scheduledDate: preservedDate, // 기존 날짜로 덮어쓰기
                };
              }

              // 4. 기존 날짜가 없으면 API 응답의 날짜 사용
              // 하지만 이 날짜도 localStorage에 저장하여 다음에 보존
              if (newSubtask.floorId && newSubtask.scheduledDate) {
                try {
                  const scheduledDateKey = `floor_scheduledDate_${newSubtask.floorId}`;
                  localStorage.setItem(
                    scheduledDateKey,
                    newSubtask.scheduledDate
                  );
                } catch (err) {
                  // localStorage 저장 실패 시 무시
                }
              }

              return newSubtask;
            });

            // scheduledDate 및 floorId 기준으로 정렬 (날짜 보존 후 정렬)
            // DB 조회 순서가 변경될 수 있으므로 클라이언트에서 정렬 처리
            updatedSubtasks = [...updatedSubtasks].sort((a, b) => {
              // scheduledDate 비교 (1순위)
              const dateA = a.scheduledDate || "";
              const dateB = b.scheduledDate || "";

              if (dateA !== dateB) {
                return dateA.localeCompare(dateB); // 날짜 오름차순 정렬
              }

              // scheduledDate가 같으면 floorId로 정렬 (2순위)
              const idA = a.floorId || a.id || "";
              const idB = b.floorId || b.id || "";

              // floorId가 숫자면 숫자로 비교, 아니면 문자열로 비교
              const numA = parseInt(idA);
              const numB = parseInt(idB);

              if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB; // 숫자 오름차순
              }

              return idA.localeCompare(idB); // 문자열 오름차순
            });

            return {
              ...newTask,
              subtasks: updatedSubtasks, // 정렬된 subtasks
            };
          });
        });
      } else {
        // 데이터가 없으면 빈 배열
        setTasks([]);
      }
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 currentDate 변경 시 일정 불러오기
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // AI 생성 일정을 메인 목록에 추가하는 핸들러
  const handleConfirmAiSchedule = async () => {
    if (!schedule) return;

    // 화면 전환
    setShowAiPlanForm(false);
    setAiPlanStep("form");
    setSchedule(null);

    // 일정 목록 다시 불러오기 (서버에 저장된 최신 데이터 반영)
    await loadTasks();
  };

  // 일정 삭제 핸들러
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await deleteSchedule(scheduleId);

      // 선택된 작업이 삭제된 작업이면 선택 해제
      if (selectedTask && selectedTask.id === scheduleId.toString()) {
        setSelectedTask(null);
      }

      // 일정 목록 다시 불러오기
      if (selectedDate) {
        await loadTasksForDate(selectedDate);
      } else {
        await loadTasks();
      }
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 직접 추가하기 폼 화면
  if (showDirectAddForm) {
    return (
      <DirectAddForm
        onBack={() => setShowDirectAddForm(false)}
        onSuccess={async (data) => {
          setShowDirectAddForm(false);
          await loadTasks();
        }}
      />
    );
  }

  // AI 플랜 폼 화면
  if (showAiPlanForm) {
    return (
      <div className="app home-view">
        <PersonalHeader />
        <main
          className="page-content"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "15px",
            marginBottom: "15px",
          }}
        >
          {aiPlanStep === "form" && (
            <AiPlanFormNew
              onSubmit={async ({ goal, startDate, endDate }) => {
                setAiPlanStep("loading");
                const payload = { goal, startDate, endDate, teamId: null };

                try {
                  const token = localStorage.getItem(AUTH_TOKEN_KEY);
                  const res = await fetch(
                    `${API_BASE_URL.replace(/\/$/, "")}/api/schedules/ai`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify(payload),
                    }
                  );

                  if (!res.ok) {
                    const fallback = buildFallbackSchedule(payload);
                    setSchedule(fallback);
                    setAiPlanStep("result");
                    return;
                  }

                  const data = await res.json();
                  setSchedule(data);
                  setAiPlanStep("result");
                } catch (e) {
                  console.error(e);
                  const fallback = buildFallbackSchedule(payload);
                  setSchedule(fallback);
                  setAiPlanStep("result");
                }
              }}
              error={null}
              onBack={() => {
                setShowAiPlanForm(false);
                setAiPlanStep("form");
                setSchedule(null);
              }}
            />
          )}
          {aiPlanStep === "loading" && (
            <div
              className="card"
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                minHeight: "870px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                margin: 0,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AiPlanLoading />
            </div>
          )}
          {aiPlanStep === "result" && schedule && (
            <div
              className="card"
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                minHeight: "870px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                margin: 0,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <AiPlanResult
                schedule={schedule}
                // 2. 여기서 onConfirm 이벤트에 핸들러를 연결합니다.
                onConfirm={handleConfirmAiSchedule}
                onRestart={() => {
                  setSchedule(null);
                  setAiPlanStep("form");
                }}
                onScheduleUpdate={setSchedule}
              />
            </div>
          )}
        </main>
        <Navbar />
      </div>
    );
  }

  // 메인 캘린더 화면
  return (
    <div
      className="app home-view"
      style={{ background: "#DFDFDF", minHeight: "100vh" }}
    >
      <PersonalHeader />

      <main
        className="page-content"
        style={{
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "0",
          marginBottom: "0",
          gap: "0",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          paddingTop: "0",
          background: "#DFDFDF",
        }}
      >
        {/* 달력과 작업 목록 컨테이너 */}
        <CalendarView
          tasks={tasks}
          loading={loading}
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setSelectedTask(null);
            setEditingTask(null);
            setEditingFloor(null);
            setEditingFloorText("");
          }}
          selectedTask={selectedTask}
          onTaskSelect={setSelectedTask}
          editingTask={editingTask}
          onEditingTaskChange={setEditingTask}
          editingFloor={editingFloor}
          onEditingFloorChange={setEditingFloor}
          editingFloorText={editingFloorText}
          onEditingFloorTextChange={setEditingFloorText}
          onTaskUpdate={async (updatedTasks) => {
            setTasks(updatedTasks);
          }}
          onFloorDelete={async (floorId) => {
            await deleteFloor(floorId);
            await loadTasks();
          }}
          onFloorUpdate={async (floorId, data) => {
            // 새로 추가된 floor인지 확인 (임시 ID인 경우)
            const isNewFloor =
              floorId && floorId.toString().startsWith("temp-");

            if (isNewFloor) {
              // 새 floor인 경우: 로컬 상태에서 scheduleId 찾기
              let targetScheduleId = null;
              let targetSubtaskData = null;

              setTasks((prevTasks) => {
                return prevTasks.map((task) => {
                  const targetSubtask = task.subtasks.find(
                    (s) => s.id === floorId
                  );
                  if (targetSubtask) {
                    targetScheduleId = task.id;
                    targetSubtaskData = targetSubtask;
                    // 로컬 상태 업데이트 - 절대 순서 변경 없음
                    // map을 사용하여 원래 인덱스 순서 그대로 유지
                    const updatedSubtasks = task.subtasks.map((subtask) => {
                      if (subtask.id === floorId) {
                        return {
                          ...subtask,
                          text: data.title || subtask.text,
                          isNew: false, // 편집 완료 표시
                        };
                      }
                      return subtask; // 다른 subtask는 그대로 유지
                    });
                    return {
                      ...task,
                      subtasks: updatedSubtasks, // 순서 그대로 유지
                    };
                  }
                  return task; // 다른 task는 그대로 유지
                });
              });

              // 새 floor를 localStorage에 저장 (다른 페이지에 다녀와도 유지)
              if (targetScheduleId && targetSubtaskData) {
                try {
                  const storageKey = `temp_floors_${targetScheduleId}`;
                  const existingFloors = JSON.parse(
                    localStorage.getItem(storageKey) || "[]"
                  );
                  const newFloorData = {
                    id: floorId,
                    scheduleId: targetScheduleId,
                    title: data.title || targetSubtaskData.text,
                    scheduledDate: targetSubtaskData.scheduledDate,
                    completed: false,
                  };
                  // 중복 제거 후 추가
                  const filteredFloors = existingFloors.filter(
                    (f) => f.id !== floorId
                  );
                  filteredFloors.push(newFloorData);
                  localStorage.setItem(
                    storageKey,
                    JSON.stringify(filteredFloors)
                  );
                } catch (error) {
                  console.error("localStorage 저장 실패:", error);
                }
              }
            } else {
              // 기존 floor인 경우: 서버에 저장
              // scheduledDate는 전송하지 않음 (403 오류 방지 및 날짜 변경 방지)
              // 현재 subtask의 scheduledDate를 찾아서 보존
              let currentSubtask = null;
              let originalScheduledDate = null;

              for (const task of tasks) {
                const subtask = task.subtasks.find(
                  (s) => s.id === floorId || s.floorId === floorId
                );
                if (subtask) {
                  currentSubtask = subtask;
                  originalScheduledDate = subtask.scheduledDate; // 원래 날짜 보존
                  break;
                }
              }

              // title만 전송 (scheduledDate 전송하지 않음 - 403 오류 방지)
              const updateData = {
                title: data.title,
              };

              try {
                await updateFloor(floorId, updateData);

                // scheduledDate를 localStorage에 저장하여 영구 보존 (다른 페이지에서도 유지)
                if (originalScheduledDate) {
                  try {
                    const scheduledDateKey = `floor_scheduledDate_${floorId}`;
                    localStorage.setItem(
                      scheduledDateKey,
                      originalScheduledDate
                    );
                  } catch (err) {
                    console.error("localStorage 저장 실패:", err);
                  }
                }

                // 수정 후에도 원래 위치 유지를 위해 로컬 상태만 업데이트
                // 절대 순서를 변경하지 않음 - map을 사용하여 원래 인덱스 유지
                // scheduledDate는 절대 변경하지 않음 (originalScheduledDate 반드시 사용)
                setTasks((prevTasks) => {
                  return prevTasks.map((task) => {
                    // 원래 순서를 유지하기 위해 map 사용 (순서 변경 없음)
                    const updatedSubtasks = task.subtasks.map((subtask) => {
                      if (
                        subtask.id === floorId ||
                        subtask.floorId === floorId
                      ) {
                        // originalScheduledDate가 있으면 반드시 사용 (날짜 절대 변경 방지)
                        return {
                          ...subtask,
                          text: data.title || subtask.text,
                          scheduledDate:
                            originalScheduledDate || subtask.scheduledDate,
                        };
                      }
                      return subtask;
                    });
                    return {
                      ...task,
                      subtasks: updatedSubtasks, // 순서 그대로 유지
                    };
                  });
                });
              } catch (error) {
                console.error("계획 수정 실패:", error);
                if (error.status === 403) {
                  alert("이 계획을 수정할 권한이 없습니다.");
                } else {
                  alert("계획 수정에 실패했습니다. 다시 시도해주세요.");
                }
                throw error; // 상위로 에러 전파
              }
            }
          }}
          onScheduleDelete={handleDeleteSchedule}
          onFloorAdd={async (scheduleId, data) => {
            try {
              // 서버에 floor 추가 API 호출
              const requestData = {
                scheduleId: parseInt(scheduleId),
                title: data.title || "새 계획",
                scheduledDate: data.scheduledDate, // YYYY-MM-DD 형식
              };

              console.log("[계획 추가 API 요청] 데이터:", requestData);
              const response = await createFloor(requestData);
              console.log("[계획 추가 API 응답] 응답:", response);

              // 응답에서 floorId 가져오기
              const newFloorId = response.floorId || response.id || null;

              if (!newFloorId) {
                throw new Error("서버에서 floorId를 반환하지 않았습니다.");
              }

              // 새 floor를 로컬 상태에 추가 (제일 밑에만 추가, 기존 순서 절대 변경 안 함)
              const newSubtask = {
                id: newFloorId.toString(),
                floorId: newFloorId, // 서버에서 받은 실제 floorId
                scheduleId: scheduleId,
                text: response.title || data.title || "새 계획",
                done: false,
                isNew: false, // 서버에 저장되었으므로 isNew: false
                scheduledDate: response.scheduledDate || data.scheduledDate, // 서버 응답의 날짜 사용
              };

              setTasks((prevTasks) => {
                // 메인 계획(task) 순서를 유지하기 위해 map 사용 (순서 변경 없음)
                return prevTasks.map((task) => {
                  if (task.id === scheduleId.toString()) {
                    // 기존 subtasks는 순서 그대로 유지하고, 새 floor만 제일 밑에 추가
                    // subtasks도 scheduledDate 기준으로 정렬하여 순서 유지
                    const updatedSubtasks = [...task.subtasks, newSubtask];

                    // 새 floor 추가 후 scheduledDate 기준으로 정렬 (순서 유지)
                    updatedSubtasks.sort((a, b) => {
                      const dateA = a.scheduledDate || "";
                      const dateB = b.scheduledDate || "";
                      if (dateA !== dateB) {
                        return dateA.localeCompare(dateB);
                      }
                      const idA = parseInt(a.floorId || a.id) || 0;
                      const idB = parseInt(b.floorId || b.id) || 0;
                      return idA - idB;
                    });

                    return {
                      ...task,
                      subtasks: updatedSubtasks, // 정렬된 subtasks
                      progress: `${
                        task.subtasks.filter((s) => s.done).length
                      }/${task.subtasks.length + 1}`,
                    };
                  }
                  return task; // 다른 task는 그대로 유지 (순서 그대로)
                });
              });

              // floorId와 title 반환 (편집 모드로 진입하기 위해)
              return {
                floorId: newFloorId.toString(),
                title: response.title || data.title || "새 계획",
              };
            } catch (error) {
              console.error("계획 추가 실패:", error);
              alert("계획 추가에 실패했습니다. 다시 시도해주세요.");
              throw error;
            }
          }}
          onScheduleUpdate={async (scheduleId, data) => {
            // schedule 업데이트 (마감일 연장 등)
            try {
              await updateSchedule(parseInt(scheduleId), data);

              // 서버에 반영되기까지 약간의 지연 후 최신 schedule 조회
              await new Promise((resolve) => setTimeout(resolve, 300));

              // 최신 schedule 정보 조회하여 실제 업데이트된 endDate 확인
              let updatedSchedule = null;
              try {
                updatedSchedule = await getSchedule(parseInt(scheduleId));
              } catch (fetchError) {
                console.error("최신 schedule 조회 실패:", fetchError);
                // 조회 실패 시 data.endDate 사용
              }

              // 원래 위치 유지를 위해 로컬 상태만 업데이트
              // 절대 순서를 변경하지 않음 - tasks와 subtasks 순서 모두 유지
              const finalEndDate = updatedSchedule?.endDate || data.endDate;
              const finalStartDate =
                updatedSchedule?.startDate || data.startDate;

              setTasks((prevTasks) => {
                return prevTasks.map((task) => {
                  if (task.id === scheduleId.toString()) {
                    // subtasks 순서는 절대 변경하지 않음
                    return {
                      ...task,
                      endDate: finalEndDate || task.endDate,
                      startDate: finalStartDate || task.startDate,
                      subtasks: task.subtasks, // subtasks 순서 그대로 유지
                    };
                  }
                  return task; // 다른 task는 그대로 유지
                });
              });

              // 응답 반환 (업데이트된 endDate 포함)
              return {
                endDate: finalEndDate || data.endDate,
                startDate: finalStartDate || data.startDate,
              };
            } catch (error) {
              console.error("일정 업데이트 실패:", error);
              throw error; // 에러를 상위로 전파
            }
          }}
          editIcon={editIcon}
        />

        {/* 액션 버튼 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            width: "100%",
            maxWidth: "var(--panel-width)",
            position: "relative",
            marginTop: "20px",
            marginBottom: "20px",
            marginLeft: "16px",
            marginRight: "16px",
            padding: "0",
          }}
        >
          <button
            onClick={() => {
              setShowAiPlanForm(true);
              setAiPlanStep("form");
            }}
            style={{
              flex: 1,
              background: "var(--brand-teal)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            AI로 추가하기
          </button>
          <button
            onClick={() => {
              setShowDirectAddForm(true);
            }}
            style={{
              flex: 1,
              background: "var(--brand-teal)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            직접 추가하기
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
