'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
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
}

const HSPlayerPage: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const playerId = params.ID as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPlayerData(user.uid, playerId);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [playerId]);

  const fetchPlayerData = async (userId: string, playerId: string) => {
    try {
      const recruitsRef = doc(db, "users", userId, "recruits", "allRecruits");
      const docSnap = await getDoc(recruitsRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Document data:", data);
        
        if (data && Array.isArray(data.players)) {
          const allPlayers = data.players;
          console.log("All players:", allPlayers);
          console.log("Looking for player with ID:", playerId);
          
          const foundPlayer = allPlayers.find((p: Player) => p.id === playerId);
          if (foundPlayer) {
            console.log("Found player:", foundPlayer);
            setPlayer(foundPlayer);
          } else {
            console.log("Player not found in the array");
          }
        } else {
          console.log("No players array found in the document");
        }
      } else {
        console.log("No such document");
      }
    } catch (error) {
      console.error("Error fetching player data: ", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!player) {
    return <div>Player not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{player.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Player Info</h2>
          <p>Position: {player.position}</p>
          <p>Class: {player.classYear}</p>
          <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}"</p>
        </div>
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Attributes</h2>
          <ul>
            {Object.entries(player.attributes).map(([key, value]) => (
              <li key={key}>{key}: {value}</li>
            ))}
          </ul>
        </div>
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Stats</h2>
          <ul>
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
      </div>
    </div>
  );
};

export default HSPlayerPage;