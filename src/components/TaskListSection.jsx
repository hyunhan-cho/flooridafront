import React, { useState } from "react";
import "./TaskListSection.css";

const ITEMS_PER_PAGE = 3;
const SUBTASKS_PER_PAGE = 5;

// ✅ 서브태스크 페이지네이션을 위해 분리된 미달성 카드 컴포넌트
function UndoneTaskCard({ task, onSubtaskToggle }) {
  const [page, setPage] = useState(0);

  const subtasks = task.subtasks || [];
  const totalPages = Math.ceil(subtasks.length / SUBTASKS_PER_PAGE);

  const startIdx = page * SUBTASKS_PER_PAGE;
  const currentSubtasks = subtasks.slice(startIdx, startIdx + SUBTASKS_PER_PAGE);

  const goPrev = (e) => {
    e.stopPropagation();
    setPage((p) => Math.max(0, p - 1));
  };
  const goNext = (e) => {
    e.stopPropagation();
    setPage((p) => Math.min(totalPages - 1, p + 1));
  };

  return (
    <div className="undone-card">
      {/* 상단: 색상점 + 타이틀 + 뱃지 */}
      <div className="undone-card-header">
        <div className="undone-card-header-left">
          <div
            className="undone-color-dot"
            style={{ background: task.color }}
          />
          <span className="undone-title">{task.title}</span>
        </div>
        <div className="undone-progress-badge">{task.progress}</div>
      </div>

      {/* 서브태스크 목록 */}
      {currentSubtasks.map((subtask) => (
        <div key={subtask.id} className="undone-subtask-item">
          <span
            className={`undone-subtask-text ${subtask.done ? "done" : ""}`}
          >
            {subtask.text}
          </span>

          {/* 체크박스 */}
          <div className="subtask-checkbox-wrapper">
            <input
              type="checkbox"
              checked={subtask.done}
              disabled={subtask.isTeamPlan}
              onChange={(e) => onSubtaskToggle?.(task, subtask, e)}
              className="subtask-checkbox"
            />
          </div>
        </div>
      ))}

      {/* 서브태스크 페이지네이션 컨트롤 (5개 이상일 때만 표시) */}
      {totalPages > 1 && (
        <div className="task-pagination" style={{ marginTop: "8px", justifyContent: "center", gap: "10px" }}>
          <button
            onClick={goPrev}
            disabled={page === 0}
            className="task-pagination-button small"
            style={{ width: "24px", height: "24px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"></path></svg>
          </button>
          <span className="task-pagination-info" style={{ fontSize: "12px" }}>
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={goNext}
            disabled={page === totalPages - 1}
            className="task-pagination-button small"
            style={{ width: "24px", height: "24px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5L16 12L9 19"></path></svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TaskListSection({
  loading,
  tasks,
  undoneTasks,
  showUndoneQuests,
  onToggleUndoneQuests,
  onSubtaskToggle,
  onUndoneSubtaskToggle,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [undonePage, setUndonePage] = useState(0);

  // 페이지네이션 계산
  const totalPages = Math.ceil((tasks?.length || 0) / ITEMS_PER_PAGE);
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentTasks = (tasks || []).slice(startIdx, endIdx);

  // 페이지 변경 시 범위 체크
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(0, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <>
      {/* 작업 목록 섹션 */}
      {loading ? (
        <div className="task-list-section-message">로딩 중...</div>
      ) : tasks.length === 0 ? (
        <div className="task-list-section-message">
          오늘의 할 일(To-Do)이 없습니다.
        </div>
      ) : (
        <>
          {/* 현재 페이지의 작업들 */}
          {currentTasks.map((task) => {
            return (
              <div key={task.id} className="task-card">
                {/* 헤더: 색상 점 + 타이틀 + 뱃지 */}
                <div className="task-card-header">
                  <div className="task-card-header-left">
                    {/* 카테고리 색상 점 */}
                    <div
                      className="task-color-dot"
                      style={{ background: task.color || "#ccc" }}
                    />
                    {/* 타이틀 */}
                    <span className="task-title">{task.title}</span>
                  </div>

                  {/* 진행률 뱃지 (7/10 등) */}
                  <div className="task-progress-badge">{task.progress}</div>
                </div>

                {/* 서브태스크 영역 (회색 박스) */}
                {(task.subtasks || []).map((subtask) => (
                  <div key={subtask.id} className="subtask-item">
                    <span
                      className={`subtask-text ${subtask.done ? "done" : ""}`}
                    >
                      {subtask.text}
                    </span>

                    {/* 체크박스 */}
                    <div className="subtask-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={subtask.done}
                        disabled={subtask.isTeamPlan}
                        onChange={(e) => onSubtaskToggle?.(task, subtask, e)}
                        className="subtask-checkbox"
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* 페이지네이션 컨트롤 (하단으로 이동) */}
          {totalPages > 1 && (
            <div className="task-pagination">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className="task-pagination-button"
              >
                {/* 왼쪽 화살표 아이콘 */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 19L8 12L15 5"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <span className="task-pagination-info">
                {currentPage + 1}{" "}
                <span className="task-pagination-separator">/</span>{" "}
                {totalPages}
              </span>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="task-pagination-button"
              >
                {/* 오른쪽 화살표 아이콘 */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 5L16 12L9 19"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* 미달성 퀘스트 섹션 */}
      {undoneTasks.length > 0 && (
        <div className="undone-section">
          {/* 헤더: 붉은색 + 둥근 모서리 */}
          <div
            onClick={onToggleUndoneQuests}
            className={`undone-header ${showUndoneQuests ? "open" : ""}`}
          >
            <span className="undone-header-title">미달성 퀘스트</span>
            {/* SVG 화살표 아이콘 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`undone-header-arrow ${showUndoneQuests ? "open" : ""
                }`}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="#1f2937"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* 미달성 퀘스트 목록 (토글) */}
          {showUndoneQuests && (
            <div className="undone-content">
              {(() => {
                // 미달성 페이지네이션 로직 (퀘스트 자체)
                const undoneTotalPages = Math.ceil((undoneTasks?.length || 0) / ITEMS_PER_PAGE);
                const undoneStartIdx = undonePage * ITEMS_PER_PAGE;
                const undoEndIdx = undoneStartIdx + ITEMS_PER_PAGE;
                const currentUndoneTasks = (undoneTasks || []).slice(undoneStartIdx, undoEndIdx);

                const goToPrevUndone = (e) => {
                  e.stopPropagation();
                  setUndonePage((prev) => Math.max(0, prev - 1));
                };
                const goToNextUndone = (e) => {
                  e.stopPropagation();
                  setUndonePage((prev) => Math.min(undoneTotalPages - 1, prev + 1));
                };

                return (
                  <>
                    {currentUndoneTasks.map((task) => (
                      <UndoneTaskCard
                        key={task.id}
                        task={task}
                        onSubtaskToggle={onUndoneSubtaskToggle}
                      />
                    ))}

                    {/* 미달성 퀘스트 페이지네이션 컨트롤 */}
                    {undoneTotalPages > 1 && (
                      <div className="task-pagination" style={{ marginTop: "10px" }}>
                        <button
                          onClick={goToPrevUndone}
                          disabled={undonePage === 0}
                          className="task-pagination-button"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15 19L8 12L15 5"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <span className="task-pagination-info">
                          {undonePage + 1}{" "}
                          <span className="task-pagination-separator">/</span>{" "}
                          {undoneTotalPages}
                        </span>

                        <button
                          onClick={goToNextUndone}
                          disabled={undonePage === undoneTotalPages - 1}
                          className="task-pagination-button"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 5L16 12L9 19"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
