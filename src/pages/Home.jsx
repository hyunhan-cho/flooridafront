import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import TopInfo from "../components/TopInfo.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import Badges from "../components/Badges.jsx";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import Weekbar from "../components/Weekbar.jsx";
import MonthProjects from "../components/MonthProjects.jsx";
import "../App.css";

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState("up");
  const [progressInfo, setProgressInfo] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });

  const goToFloor = (targetFloor) => {
    if (isMoving || !isOpen || currentFloor === targetFloor) return;
    setDirection(targetFloor > currentFloor ? "up" : "down");
    setIsOpen(false);
    setTimeout(() => setIsMoving(true), 1500);
    setTimeout(() => {
      setIsMoving(false);
      setCurrentFloor(targetFloor);
      setTimeout(() => setIsOpen(true), 500);
    }, 3500);
  };

  const floor = floors[currentFloor];

  useEffect(() => {
    const maxFloor = Object.keys(floors).length;
    const desired = Math.max(
      1,
      Math.min(1 + (progressInfo?.done ?? 0), maxFloor)
    );
    if (desired !== currentFloor) {
      goToFloor(desired);
    }
  }, [progressInfo, currentFloor, isMoving, isOpen]);

  return (
    <div className="app home-view">
      <BackButton />

      <div className="home-header">
        <img className="home-logo" src="/images/logo.png" alt="FLOORIDA" />
      </div>

      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <TopInfo currentFloor={currentFloor} direction={direction} />
          <div className="floor-scene" style={floor.sceneStyle}>
            <div className="scene-label">{floor.label}</div>
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="cloud c3" />
          </div>
          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          />
          <img
            className="character-img"
            src="/images/mascot.png"
            alt="오늘의 나"
            title="오늘의 나"
            loading="eager"
            decoding="async"
          />
          <ElevatorDoor isOpen={isOpen} />
        </div>
      </div>

      <QuestList onProgressChange={setProgressInfo} />
      <Weekbar done={progressInfo.done ?? 0} total={progressInfo.total ?? 0} />
      <MonthProjects />
      <Badges currentFloor={currentFloor} />

      <Navbar
        onNavigate={(key) => {
          if (key === "home") navigate("/home");
          // 다른 탭 있으면 여기도 라우팅
        }}
      />
    </div>
  );
}
