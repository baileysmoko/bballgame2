'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebaseConfig'; // Adjust the import path as needed
import { doc, getDoc, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface RecruitData {
  playerId: string;
  points: number;
  recruitingInfo?: { playerId: string }[];
}

interface PlayerDetails {
  id: string;
  name: string;
  position: string;
  classYear: string;
  height: number;
  scoutingReport: string;
  stats: {
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
  };
  recruitingInfo?: RecruitData[];
}

const MyRecruitsPage: React.FC = () => {
  const [recruits, setRecruits] = useState<RecruitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetails | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<{[key: string]: string}>({});

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    const fetchRecruits = async (userId: string) => {
      try {
        const team1Ref = doc(db, "users", userId, "teams", "1");
    
        const docSnap = await getDoc(team1Ref);
        if (!docSnap.exists()) {
          setError('Team 1 document not found. Please generate teams first.');
          setLoading(false);
          return;
        }
    
        const teamData = docSnap.data();
        console.log('Team data:', teamData);
        let myRecruits: RecruitData[] = teamData.myRecruits || [];
    
        // Fetch recruiting info for each recruit
        myRecruits = await Promise.all(myRecruits.map(async (recruit) => {
          const parts = recruit.playerId.split('-');
          if (parts.length >= 3) {
            const teamNumber = parts[2];
            const teamRef = doc(db, "users", userId, "recruits", teamNumber);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              if (teamData && Array.isArray(teamData.players)) {
                const player = teamData.players.find((p: PlayerDetails) => p.id === recruit.playerId);
                if (player && player.recruitingInfo) {
                  return { ...recruit, recruitingInfo: player.recruitingInfo };
                }
              }
            }
          }
          return recruit;
        }));
    
        console.log('Fetched recruits:', myRecruits);
        setRecruits(myRecruits);
        await fetchPlayerNames(userId, myRecruits);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching recruits: ", error);
        setError('An error occurred while fetching recruits.');
        setLoading(false);
      }
    };
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchRecruits(user.uid);
      } else {
        setError('You must be logged in to view recruits.');
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);
  const fetchPlayerNames = async (userId: string, recruits: RecruitData[]) => {
    const names: {[key: string]: string} = {};
    for (const recruit of recruits) {
      const parts = recruit.playerId.split('-');
      if (parts.length >= 3) {
        const teamNumber = parts[2];
        const teamRef = doc(db, "users", userId, "recruits", teamNumber);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          if (teamData && Array.isArray(teamData.players)) {
            const player = teamData.players.find((p: PlayerDetails) => p.id === recruit.playerId);
            if (player) {
              names[recruit.playerId] = player.name;
            }
          }
        }
      }
    }
    setPlayerNames(names);
  };

  const fetchPlayerDetails = async (playerId: string) => {
    setPlayerError(null);
    try {
      console.log(`Attempting to fetch player with ID: ${playerId}`);
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }
      const userId = auth.currentUser.uid;
      
      // Extract the team number from the player ID
      const parts = playerId.split('-');
      console.log(`Player ID parts: ${JSON.stringify(parts)}`);
      
      if (parts.length < 3) {
        throw new Error(`Invalid player ID format: ${playerId}`);
      }
      
      const teamNumber = parts[2]; // Change this line
      console.log(`Extracted team number: ${teamNumber}`);
      
      const teamRef = doc(db, "users", userId, "recruits", teamNumber);
      console.log(`Attempting to fetch team document: users/${userId}/recruits/${teamNumber}`);
      
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        console.log(`Team data: ${JSON.stringify(teamData)}`);
        if (teamData && Array.isArray(teamData.players)) {
          const playerData = teamData.players.find((p: PlayerDetails) => p.id === playerId);
          if (playerData) {
            setSelectedPlayer(playerData);
            console.log(`Player data fetched successfully:`, playerData);
          } else {
            console.log(`No player found with ID: ${playerId}`);
            setPlayerError(`Player with ID ${playerId} not found in team ${teamNumber}.`);
            setSelectedPlayer(null);
          }
        } else {
          throw new Error(`Team ${teamNumber} data is not in the expected format`);
        }
      } else {
        throw new Error(`Team ${teamNumber} document not found`);
      }
    } catch (error) {
      console.error("Error fetching player details: ", error);
      setPlayerError(`An error occurred while fetching player details: ${(error as Error).message}`);
      setSelectedPlayer(null);
    }
  };

  const handlePlayerClick = (playerId: string) => {
    fetchPlayerDetails(playerId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Recruits</h1>
      {recruits.length === 0 ? (
        <p>No recruits found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2">
  {recruits.map((recruit) => (
    <li 
      key={recruit.playerId} 
      className="border p-2 rounded cursor-pointer hover:bg-gray-100 flex flex-col"
      onClick={() => handlePlayerClick(recruit.playerId)}
    >
      <div className="flex justify-between items-center">
        <div>
          <span className="font-semibold">Player:</span> {playerNames[recruit.playerId] || 'Loading...'}
          <span className="ml-4 font-semibold">Points:</span> {recruit.points}
        </div>
      </div>
      <div className="text-sm text-white mt-1">
        <span className="font-semibold">Teams:</span> {
          recruit.recruitingInfo && recruit.recruitingInfo.length > 0
            ? recruit.recruitingInfo.map(info => info.playerId).join(', ')
            : 'No teams'
        }
      </div>
    </li>
  ))}
</ul>
          <div className="border p-4 rounded">
            {playerError && <p className="text-red-500 mb-4">{playerError}</p>}
            {selectedPlayer ? (
              <>
                <h2 className="text-xl font-bold mb-2">{selectedPlayer.name}</h2>
                <p><span className="font-semibold">Position:</span> {selectedPlayer.position}</p>
                <p><span className="font-semibold">Class:</span> {selectedPlayer.classYear}</p>
                <p><span className="font-semibold">Height:</span> {Math.floor(selectedPlayer.height / 12)}'{selectedPlayer.height % 12}"</p>
                <h3 className="text-lg font-semibold mt-4 mb-2">Scouting Report</h3>
                <p>{selectedPlayer.scoutingReport}</p>
                <h3 className="text-lg font-semibold mt-4 mb-2">Stats</h3>
                <ul>
                  <ul>
                    <li>Games Played: {selectedPlayer.stats.gamesPlayed}</li>
                    <li>Points: {selectedPlayer.stats.points} ({(selectedPlayer.stats.points / selectedPlayer.stats.gamesPlayed).toFixed(1)} PPG)</li>
                    <li>Rebounds: {selectedPlayer.stats.rebounds} ({(selectedPlayer.stats.rebounds / selectedPlayer.stats.gamesPlayed).toFixed(1)} RPG)</li>
                    <li>Assists: {selectedPlayer.stats.assists} ({(selectedPlayer.stats.assists / selectedPlayer.stats.gamesPlayed).toFixed(1)} APG)</li>
                    <li>Steals: {selectedPlayer.stats.steals} ({(selectedPlayer.stats.steals / selectedPlayer.stats.gamesPlayed).toFixed(1)} SPG)</li>
                    <li>Blocks: {selectedPlayer.stats.blocks} ({(selectedPlayer.stats.blocks / selectedPlayer.stats.gamesPlayed).toFixed(1)} BPG)</li>
                    <li>FG: {selectedPlayer.stats.fgm}/{selectedPlayer.stats.fga} ({((selectedPlayer.stats.fgm / selectedPlayer.stats.fga) * 100).toFixed(1)}%)</li>
                    <li>3PT: {selectedPlayer.stats.tpm}/{selectedPlayer.stats.tpa} ({((selectedPlayer.stats.tpm / selectedPlayer.stats.tpa) * 100).toFixed(1)}%)</li>
                    <li>FT: {selectedPlayer.stats.ftm}/{selectedPlayer.stats.fta} ({((selectedPlayer.stats.ftm / selectedPlayer.stats.fta) * 100).toFixed(1)}%)</li>
                  </ul>
                </ul>
              </>
            ) : (
              <p>Select a player to view details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecruitsPage;