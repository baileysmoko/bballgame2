'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface PlayerStats {
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
}

interface Player {
  id: string;
  name: string;
  classYear: string;
  height: number;
  position: string;
  attributes: {
    [key: string]: number;
  };
  stats: PlayerStats;
  committed?: boolean;
  teamCommittedTo?: string;
  scout: number;
  scoutedAttributes: {
    [key: string]: number;
  };
}

interface TeamData {
  recruitingPoints: number;
  pendingRecruitingActions: Array<{ playerId: string; points: number; offeredScholarship: boolean }>;
}

const HSPlayerPage: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoints, setSelectedPoints] = useState<number>(0);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const params = useParams();
  const playerId = params.ID as string;
  const offerScholarship = async () => {
    if (!auth.currentUser || !player || player.committed) {
      alert('You cannot offer a scholarship to this player.');
      return;
    }
  
    try {
      const userId = auth.currentUser.uid;
      const team1Ref = doc(db, "users", userId, "teams", "1");
  
      const docSnap = await getDoc(team1Ref);
      if (!docSnap.exists()) {
        alert('Team 1 document not found. Please generate teams first.');
        return;
      }
  
      const existingActions = docSnap.data().pendingRecruitingActions || [];
      const updatedActions = existingActions.map((action: { playerId: string; points: number; offeredScholarship: boolean }) => 
        action.playerId === player.id ? { ...action, offeredScholarship: true } : action
      );
  
      if (!updatedActions.some((action: { playerId: string }) => action.playerId === player.id)) {
        updatedActions.push({ playerId: player.id, points: 0, offeredScholarship: true });
      }
  
      await updateDoc(team1Ref, {
        pendingRecruitingActions: updatedActions
      });
  
      alert(`Offered a scholarship to ${player.name}`);
    } catch (error) {
      console.error("Error offering scholarship: ", error);
      alert('An error occurred while offering the scholarship.');
    }
  };
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPlayerData(user.uid, playerId);
        fetchTeamData(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [playerId]);
  const getRating = (average: number): string => {
    if (average >= 0 && average < 20) return 'None';
    if (average >= 20 && average < 40) return 'Poor';
    if (average >= 40 && average < 60) return 'Fair';
    if (average >= 60 && average < 80) return 'Good';
    if (average >= 80 && average <= 100) return 'Exc';
    return 'Unknown';
  };

  const calculateRatings = (player: Player) => {
    const shooting = (player.scoutedAttributes.threePoint + player.scoutedAttributes.midRange + player.scoutedAttributes.closeRange + player.scoutedAttributes.freeThrow) / 4;
    const defense = (player.scoutedAttributes.passSteal + player.scoutedAttributes.dribbleSteal + player.scoutedAttributes.block) / 3;
    const hands = (player.scoutedAttributes.passing + player.scoutedAttributes.dribbling) / 2;
    const rebounding = (player.scoutedAttributes.offensiveRebounding + player.scoutedAttributes.defensiveRebounding) / 2;
    const intelligence = (player.scoutedAttributes.defensiveFoul + player.scoutedAttributes.shotIQ + player.scoutedAttributes.passingIQ) / 3;
    const athleticism = (player.scoutedAttributes.createSpace + player.scoutedAttributes.defensiveQuickness + player.scoutedAttributes.stamina) / 3;

    return {
      shooting: getRating(shooting),
      defense: getRating(defense),
      hands: getRating(hands),
      rebounding: getRating(rebounding),
      intelligence: getRating(intelligence),
      athleticism: getRating(athleticism),
    };
  };

  const getScoutRating = (scout: number): string => {
    if (scout >= 37.5 && scout <= 50) return 'Poor';
    if (scout >= 25 && scout < 37.5) return 'Fair';
    if (scout >= 12.5 && scout < 25) return 'Good';
    if (scout >= 0 && scout < 12.5) return 'Exc';
    return 'Unknown';
  };

  const fetchPlayerData = async (userId: string, playerId: string) => {
    try {
      console.log("Fetching player with ID:", playerId);
      const parts = playerId.split('-');
      if (parts.length < 3) {
        throw new Error("Invalid player ID format");
      }
      const teamNumber = parts[2];
      const teamRef = doc(db, "users", userId, "recruits", teamNumber);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        if (teamData && Array.isArray(teamData.players)) {
          const playerData = teamData.players.find(p => p.id === playerId);
          if (playerData) {
            setPlayer({
              ...playerData,
              committed: playerData.committed || false,
              teamCommittedTo: playerData.teamCommittedTo || null
            });
          } else {
            console.log("Player not found in team data");
          }
        } else {
          console.log("Team data is not in the expected format");
        }
      } else {
        console.log("Team document not found");
      }
    } catch (error) {
      console.error("Error fetching player data: ", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async (userId: string) => {
    try {
      const team1Ref = doc(db, "users", userId, "teams", "1");
      const docSnap = await getDoc(team1Ref);

      if (docSnap.exists()) {
        setTeamData(docSnap.data() as TeamData);
      }
    } catch (error) {
      console.error("Error fetching team data: ", error);
    }
  };

  const assignRecruitingPoints = async () => {
    if (!auth.currentUser || !player || player.committed) {
      alert('You cannot assign recruiting points to this player.');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const team1Ref = doc(db, "users", userId, "teams", "1");

      const docSnap = await getDoc(team1Ref);
      if (!docSnap.exists()) {
        alert('Team 1 document not found. Please generate teams first.');
        return;
      }

      const existingActions = docSnap.data().pendingRecruitingActions || [];
      const actionsToKeep = existingActions.filter((action: { playerId: string }) => action.playerId !== player.id);
      const updatedActions = [...actionsToKeep, { playerId: player.id, points: selectedPoints }];

      const totalPoints = updatedActions.reduce((sum, action) => sum + action.points, 0);
      const remainingPoints = 150 - totalPoints;

      if (selectedPoints > remainingPoints) {
        alert('Not enough recruiting points available.');
        return;
      }

      await updateDoc(team1Ref, {
        pendingRecruitingActions: updatedActions,
        recruitingPoints: remainingPoints
      });

      alert(`Assigned ${selectedPoints} recruiting points to ${player.name}`);
    } catch (error) {
      console.error("Error assigning recruiting points: ", error);
      alert('An error occurred while assigning the recruiting points.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!player) {
    return <div>Player not found</div>;
  }
  const ratings = calculateRatings(player);
  const scoutRating = getScoutRating(player.scout);

  return (
    <div className="container mx-auto p-4">
      <div className="border p-4 rounded shadow">
        <h1 className="text-3xl font-bold mb-4">{player.name}</h1>
        <p className="text-xl mb-2">Position: {player.position} | Class: {player.classYear} | Height: {Math.floor(player.height / 12)}'{player.height % 12}"</p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-2">Scouted Attributes</h2>
        <table className="min-w-full bg-gray-800 rounded-lg">
          <thead>
            <tr>
              <th className="px-4 py-2">Scout</th>
              <th className="px-4 py-2">Shooting</th>
              <th className="px-4 py-2">Defense</th>
              <th className="px-4 py-2">Hands</th>
              <th className="px-4 py-2">Rebounding</th>
              <th className="px-4 py-2">Intelligence</th>
              <th className="px-4 py-2">Athleticism</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">{scoutRating}</td>
              <td className="px-4 py-2">{ratings.shooting}</td>
              <td className="px-4 py-2">{ratings.defense}</td>
              <td className="px-4 py-2">{ratings.hands}</td>
              <td className="px-4 py-2">{ratings.rebounding}</td>
              <td className="px-4 py-2">{ratings.intelligence}</td>
              <td className="px-4 py-2">{ratings.athleticism}</td>
            </tr>
          </tbody>
        </table>
        
        <h2 className="text-2xl font-semibold mt-6 mb-2">Stats</h2>
        <ul className="grid grid-cols-2 gap-2">
          <li>Games Played: {player.stats.gamesPlayed}</li>
          <li>Points: {player.stats.points} ({(player.stats.points / player.stats.gamesPlayed).toFixed(1)} PPG)</li>
          <li>Rebounds: {player.stats.rebounds} ({(player.stats.rebounds / player.stats.gamesPlayed).toFixed(1)} RPG)</li>
          <li>Assists: {player.stats.assists} ({(player.stats.assists / player.stats.gamesPlayed).toFixed(1)} APG)</li>
          <li>Steals: {player.stats.steals} ({(player.stats.steals / player.stats.gamesPlayed).toFixed(1)} SPG)</li>
          <li>Blocks: {player.stats.blocks} ({(player.stats.blocks / player.stats.gamesPlayed).toFixed(1)} BPG)</li>
          <li>FG: {player.stats.fgm}/{player.stats.fga} ({((player.stats.fgm / player.stats.fga) * 100).toFixed(1)}%)</li>
          <li>3PT: {player.stats.tpm}/{player.stats.tpa} ({((player.stats.tpm / player.stats.tpa) * 100).toFixed(1)}%)</li>
          <li>FT: {player.stats.ftm}/{player.stats.fta} ({((player.stats.ftm / player.stats.fta) * 100).toFixed(1)}%)</li>
        </ul>
      </div>
  
      <div className="border p-4 rounded shadow mt-4">
        <h2 className="text-xl font-semibold mb-2">Recruiting</h2>
        {player.committed ? (
          <p className="text-red-500 mb-4">
            This player has already committed to {player.teamCommittedTo === "1" ? "your team" : `Team ${player.teamCommittedTo}`}.
          </p>
        ) : (
          <>
            <div className="flex space-x-2 mb-4">
              {[...Array(11)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedPoints(i)} 
                  className={`py-2 px-4 rounded ${selectedPoints === i ? 'bg-green-700 text-white' : 'bg-gray-300'}`}
                  disabled={player.committed}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={assignRecruitingPoints}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={player.committed}
              >
                Submit Points
              </button>
              <button 
                onClick={offerScholarship}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={player.committed}
              >
                Offer Scholarship
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HSPlayerPage;