'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import GenerateTeamsButton from '../../GenerateTeamsButton';
import SimulateNextDayButton from '../../SimulateNextDayButton';
import Link from 'next/link';

interface ScheduleData {
  [day: string]: {
    [matchId: string]: [string, string];
  };
}

interface GameResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

const SchedulePage: React.FC = () => {
    const [schedule, setSchedule] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDay, setCurrentDay] = useState(1);
    const [gameResults, setGameResults] = useState<{ [day: string]: GameResult[] }>({});
    const [teamRecord, setTeamRecord] = useState({ wins: 0, losses: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchSchedule(user.uid);
        fetchCurrentDay(user.uid);
      } else {
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (auth.currentUser) {
      fetchGameResults(auth.currentUser.uid, currentDay);
    }
  }, [currentDay]);

  const fetchSchedule = async (userId: string) => {
    try {
      const scheduleCollectionRef = collection(db, "users", userId, "schedule");
      const scheduleDocs = await getDocs(scheduleCollectionRef);

      if (!scheduleDocs.empty) {
        const scheduleData: ScheduleData = {};
        scheduleDocs.forEach(doc => {
          scheduleData[doc.id] = doc.data() as { [matchId: string]: [string, string] };
        });
        setSchedule(scheduleData);
      } else {
        setSchedule(null);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentDay = async (userId: string) => {
    try {
      const currentDayDocRef = doc(db, "users", userId, "currentDay", "day");
      const currentDayDoc = await getDoc(currentDayDocRef);
      if (currentDayDoc.exists()) {
        const data = currentDayDoc.data();
        setCurrentDay(data.day || 1);
      }
    } catch (error) {
      console.error("Error fetching current day:", error);
    }
  };

  const fetchGameResults = async (userId: string, currentDay: number) => {
  try {
    const allResults: { [day: string]: GameResult[] } = {};
    for (let day = 1; day < currentDay; day++) {
      const resultsCollectionRef = collection(db, "users", userId, "gameResults", day.toString(), "games");
      const resultsDocs = await getDocs(resultsCollectionRef);
      const dayResults: GameResult[] = [];
      resultsDocs.forEach(doc => {
        dayResults.push(doc.data() as GameResult);
      });
      allResults[day] = dayResults;
    }
    setGameResults(allResults);
  } catch (error) {
    console.error("Error fetching game results:", error);
  }
};

const renderSchedule = () => {
    if (!schedule) return null;
  
    return Object.entries(schedule).map(([day, matches]) => {
      const team1Match = Object.entries(matches).find(([_, match]) => match && match.includes && match.includes("1"));
      if (!team1Match) return null;
  
      const [matchId, teamMatch] = team1Match;
      if (!teamMatch || !Array.isArray(teamMatch) || teamMatch.length < 2) return null;
  
      const opponent = teamMatch[0] === "1" ? teamMatch[1] : teamMatch[0];
      const result = gameResults[day]?.find(r => 
        (r && r.homeTeam === "1" && r.awayTeam === opponent) ||
        (r && r.awayTeam === "1" && r.homeTeam === opponent)
      );
  
      return (
        <div key={day} className="mb-2">
          <span className="font-bold">Day {day}:</span>{' '}
          <Link href="../team/1" className="text-blue-500 hover:underline">Team 1</Link>{' '}
          vs{' '}
          <Link href={`/team/${opponent}`} className="text-blue-500 hover:underline">Team {opponent}</Link>
          {result && (
            <>
              <span className="ml-2">
                Score: {result.homeTeam === "1" ? result.homeScore : result.awayScore} - 
                       {result.homeTeam === "1" ? result.awayScore : result.homeScore}
              </span>
              <Link href={`/play-by-play/${day}/${result.matchId}`} className="ml-2 text-blue-500 hover:underline">
                Play-by-Play
              </Link>
              <Link href={`/box-score/${day}/${result.matchId}`} className="ml-2 text-blue-500 hover:underline">
                Box Score
              </Link>
            </>
          )}
        </div>
      );
    });
  };

  const handleSimulationComplete = () => {
    const user = auth.currentUser;
    if (user) {
      fetchCurrentDay(user.uid);
      fetchGameResults(user.uid, currentDay + 1);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Team 1 Schedule</h1>
      {schedule && Object.keys(schedule).length > 0 ? (
        <>
          <div>{renderSchedule()}</div>
          <SimulateNextDayButton
            userId={auth.currentUser!.uid}
            onSimulationComplete={handleSimulationComplete}
          />
        </>
      ) : (
        <GenerateTeamsButton
          onTeamsGenerated={() => fetchSchedule(auth.currentUser!.uid)}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};

export default SchedulePage;
