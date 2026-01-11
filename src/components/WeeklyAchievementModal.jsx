import React, { useEffect, useState } from "react";
import { getCalendarStats } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

const WEEKDAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// 이번 주의 날짜 계산 (월요일부터 일요일까지)
function getCurrentWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0 = 일요일, 1 = 월요일, ...
  const mondayOffset = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 아니면 1-day
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  const weekDates = [];
  const weekDateObjects = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.getDate());
    weekDateObjects.push(date);
  }
  
  return { weekDates, weekDateObjects, monday };
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 완료율에 따른 색상 결정
function getColorByCompletionRate(rate) {
  if (rate === 0) return "#FF6A6A"; // 빨강
  if (rate >= 1 && rate <= 79) return "#E9DD3B"; // 노랑
  if (rate >= 80 && rate <= 100) return "#67D856"; // 초록
  return "transparent"; // 기본값
}

export default function WeeklyAchievementModal({ onClose }) {
  const { weekDates, weekDateObjects, monday } = getCurrentWeekDates();
  const today = new Date().getDate();
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  // API 호출
  useEffect(() => {
    const loadCalendarData = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const startDate = formatDate(monday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const endDate = formatDate(sunday);
        
        const data = await getCalendarStats(startDate, endDate);
        setCalendarData(data);
      } catch (error) {
        console.error("캘린더 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [monday]);

  // 날짜별 완료율 가져오기
  const getCompletionRate = (dateObj) => {
    if (!calendarData || !Array.isArray(calendarData)) return null;
    const dateStr = formatDate(dateObj);
    const dayData = calendarData.find((item) => item.date === dateStr);
    return dayData ? dayData.completionRate : null;
  };

  // 날짜별 상태 및 색상 결정
  const getDateStatus = (date, dateObj) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);
    
    // 미래 날짜는 색상 없이 표시
    if (compareDate > todayDate) {
      return { status: "normal", color: null };
    }
    
    const completionRate = getCompletionRate(dateObj);
    
    // 오늘 날짜는 달성했을 때만 색상 표시
    if (date === today) {
      const isTodayDate = compareDate.getTime() === todayDate.getTime();
      if (isTodayDate) {
        // 오늘 날짜이고 completionRate가 있고 0보다 크면 색상 표시
        if (completionRate !== null && completionRate > 0) {
          return {
            status: "current",
            color: getColorByCompletionRate(completionRate),
          };
        }
        // 오늘 날짜이지만 달성하지 않았으면 색상 없이 표시
        return { status: "current", color: null };
      }
    }
    
    if (completionRate === null) {
      return { status: "normal", color: null };
    }
    
    if (completionRate === 0) {
      return { status: "red", color: "#FF6A6A" };
    }
    
    if (completionRate >= 1 && completionRate <= 79) {
      return { status: "yellow", color: "#E9DD3B" };
    }
    
    if (completionRate >= 80 && completionRate <= 100) {
      return { status: "green", color: "#67D856" };
    }
    
    return { status: "normal", color: null };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="weekly-achievement-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="weekly-achievement-title">이번주의 달성률</h2>
        
        <div className="weekly-achievement-calendar">
          <div className="weekly-weekdays">
            {WEEKDAY_LABELS.map((day) => (
              <span key={day} className="weekly-wd">
                {day}
              </span>
            ))}
          </div>
          <div className="weekly-dates">
            {weekDates.map((date, idx) => {
              const dateObj = weekDateObjects[idx];
              const { status, color } = getDateStatus(date, dateObj);
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              const compareDate = new Date(dateObj);
              compareDate.setHours(0, 0, 0, 0);
              const isToday = compareDate.getTime() === todayDate.getTime();
              
              // 오늘 날짜이지만 색상이 없으면 border만 표시
              const style = {};
              if (isToday && !color) {
                style.border = "3px solid #111827";
                style.boxSizing = "border-box";
              } else if (color) {
                style.backgroundColor = color;
              }
              
              return (
                <div
                  key={idx}
                  className={`weekly-date weekly-date--${status}`}
                  style={style}
                >
                  {date}
                </div>
              );
            })}
          </div>
        </div>
        
        <button className="weekly-achievement-confirm" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}

