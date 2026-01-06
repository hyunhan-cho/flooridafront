import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";

export default function TeamCalendar() {
  const navigate = useNavigate();
  const { teamId } = useParams();

  return (
    <div className="app home-view team-calendar">
      <TeamHeader />

      <main className="page-content"></main>

      <Navbar />
    </div>
  );
}
