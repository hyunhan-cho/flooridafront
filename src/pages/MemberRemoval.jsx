// src/pages/MemberRemoval.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";

export default function MemberRemoval() {
  const navigate = useNavigate();

  // 아직 API 전이니까 더미 선택 상태만
  const [selectedIds, setSelectedIds] = useState([]);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="app home-view member-removal">
      {/* ✅ 헤더/네브바는 RoomManagement랑 동일하게 */}
      <TeamHeader />

      {/* ✅ 이 페이지 전용 CSS (전역 배경 건드리지 않음) */}
      <style>{`
        .member-removal .mr-wrap{
          width: var(--panel-width);
          max-width: 100%;
        }

        /* 상단: 백버튼 + 타이틀 + 서브텍스트 (RoomManagement랑 동일 톤) */
        .member-removal .mr-top{
          margin-top: 10px;
          padding: 10px 2px 6px;
          color: #fff;
        }
        .member-removal .mr-title-row{
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .member-removal .mr-back{
          width: 34px;
          height: 34px;
          border: 0;
          background: transparent;
          color: #fff;
          font-size: 34px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transform: translateY(-1px);
        }
        .member-removal .mr-title{
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.2px;
          margin: 0;
        }
        .member-removal .mr-sub{
          margin: 0 0 12px 44px; 
          font-size: 14px;
          opacity: 0.9;
          font-weight: 700;
        }

        /* 큰 흰 박스 (스크린샷의 둥근 카드) */
        .member-removal .mr-card{
          width: 92%;
          margin: 12px auto 0;
          background: #fff;
          border-radius: 28px;
          padding: 22px 22px 26px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        /* 카드 안 타이틀/설명 */
        .member-removal .mr-card-title{
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 900;
          color: #2f6f6d;
          letter-spacing: -0.2px;
        }
        .member-removal .mr-card-desc{
          margin: 0 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: rgba(0,0,0,0.6);
        }

        .member-removal .mr-label{
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 900;
          color: rgba(0,0,0,0.65);
        }

        /* (다음 단계용) 리스트 영역 틀만 잡아둠 */
        .member-removal .mr-list{
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        /* (다음 단계용) 아이템 기본 스타일 */
        .member-removal .mr-item{
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 14px 14px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          cursor: pointer;
          background: #fff;
        }

        /* 선택된 상태 */
        .member-removal .mr-item.selected{
          background: rgba(47,111,109,0.12);
          border-color: rgba(47,111,109,0.85);
        }

        .member-removal .mr-name{
          font-size: 16px;
          font-weight: 900;
          color: rgba(0,0,0,0.75);
        }

        .member-removal .mr-check{
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 2px solid rgba(0,0,0,0.18);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 900;
          color: #fff;
          background: transparent;
        }
        .member-removal .mr-item.selected .mr-check{
          background: rgba(47,111,109,0.9);
          border-color: rgba(47,111,109,0.9);
        }

        /* 하단 버튼 */
        .member-removal .mr-cta{
          margin-top: 18px;
          width: 100%;
          height: 54px;
          border: 0;
          border-radius: 12px;
          background: rgba(47,111,109,0.85);
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }
        .member-removal .mr-cta:disabled{
          opacity: 0.5;
          cursor: not-allowed;
        }
        .member-removal .mr-cta:active{
          transform: translateY(1px);
        }
      `}</style>

      <main className="page-content">
        <div className="mr-wrap">
          {/* ✅ 상단 텍스트/백버튼: RoomManagement 구조 그대로 */}
          <section className="mr-top">
            <div className="mr-title-row">
              <button
                className="mr-back"
                type="button"
                aria-label="뒤로가기"
                onClick={() => navigate(-1)}
              >
                ‹
              </button>
            </div>
          </section>

          {/* ✅ 하얀 박스(카드) + 텍스트들 먼저 */}
          <section className="mr-card">
            <h3 className="mr-card-title">팀원 관리</h3>
            <p className="mr-card-desc">팀에서 팀원을 퇴출시킬 수 있습니다.</p>

            <p className="mr-label">팀원 선택 (최소 1명)</p>

            {/* 더미 리스트(API 전이라서) — 원하면 바로 지워도 됨 */}
            <div className="mr-list">
              {[
                { id: 1, name: "시은" },
                { id: 2, name: "현한" },
                { id: 3, name: "수진" },
              ].map((m) => {
                const selected = selectedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`mr-item ${selected ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggle(m.id);
                    }}
                  >
                    <div className="mr-name">{m.name}</div>
                    <div className="mr-check">{selected ? "✓" : ""}</div>
                  </div>
                );
              })}
            </div>

            <button
              className="mr-cta"
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => {
                console.log("퇴출 대상:", selectedIds);
              }}
            >
              퇴출시키기
            </button>
          </section>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
