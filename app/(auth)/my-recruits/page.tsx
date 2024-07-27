'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
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
  points: number; // Points assigned to the player
}

const MyRecruitsPage: React.FC = () => {
  const [myRecruits, setMyRecruits] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchMyRecruits(user.uid);
      } else {
        setLoading(false);
        setMyRecruits([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchMyRecruits = async (userId: string) => {
    try {
      const myRecruitsRef = collection(db, "users", userId, "myRecruits");
      const querySnapshot = await getDocs(myRecruitsRef);
      const fetchedRecruits: Player[] = [];

      querySnapshot.forEach((doc) => {
        fetchedRecruits.push({ id: doc.id, ...doc.data() } as Player);
      });

      setMyRecruits(fetchedRecruits);
    } catch (error) {
      console.error("Error fetching my recruits: ", error);
      setMyRecruits([]);
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerCard = (player: Player) => (
    <div key={player.id} className="border p-4 rounded shadow">
      <h3 className="font-bold">{player.name}</h3>
      <p>Position: {player.position}</p>
      <p>Class: {player.classYear}</p>
      <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}"</p>
      <p>Points Assigned: {player.points}</p>
      <div className="mt-2">
        <h4 className="font-semibold">Stats:</h4>
        <p>Games: {player.stats.gamesPlayed}</p>
        <p>PPG: {(player.stats.points / player.stats.gamesPlayed).toFixed(1)}</p>
        <p>RPG: {(player.stats.rebounds / player.stats.gamesPlayed).toFixed(1)}</p>
        <p>APG: {(player.stats.assists / player.stats.gamesPlayed).toFixed(1)}</p>
      </div>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Recruits</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {myRecruits.length === 0 ? (
          <p>No recruits found.</p>
        ) : (
          myRecruits.map(renderPlayerCard)
        )}
      </div>
    </div>
  );
};

export default MyRecruitsPage;
