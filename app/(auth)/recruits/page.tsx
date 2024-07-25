'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import GenerateTeamsButton from '../../GenerateTeamsButton';

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
const RecruitsPage: React.FC = () => {
  const [recruits, setRecruits] = useState<{ [key: string]: Player[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teamsGenerated, setTeamsGenerated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchRecruits(user.uid);
      } else {
        setLoading(false);
        setRecruits({});
        setTeamsGenerated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchRecruits = async (userId: string) => {
    try {
      const recruitsCollectionRef = collection(db, "users", userId, "recruits");
      const querySnapshot = await getDocs(recruitsCollectionRef);
      const fetchedRecruits: { [key: string]: Player[] } = {};

      querySnapshot.forEach((doc) => {
        fetchedRecruits[doc.id] = doc.data().players;
      });

      setRecruits(fetchedRecruits);
      setTeamsGenerated(Object.keys(fetchedRecruits).length > 0);
    } catch (error) {
      console.error("Error fetching recruits: ", error);
      setRecruits({});
      setTeamsGenerated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamsGenerated = () => {
    if (auth.currentUser) {
      fetchRecruits(auth.currentUser.uid);
    }
  };

  const renderPlayerCard = (player: Player) => (
    <div key={player.id} className="border p-4 rounded shadow cursor-pointer" onClick={() => setSelectedPlayer(player)}>
      <h3 className="font-bold">{player.name}</h3>
      <p>Position: {player.position}</p>
      <p>Class: {player.classYear}</p>
      <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}"</p>
      <div className="mt-2">
        <h4 className="font-semibold">Stats:</h4>
        <p>Games: {player.stats.gamesPlayed}</p>
        <p>PPG: {(player.stats.points / player.stats.gamesPlayed).toFixed(1)}</p>
        <p>RPG: {(player.stats.rebounds / player.stats.gamesPlayed).toFixed(1)}</p>
        <p>APG: {(player.stats.assists / player.stats.gamesPlayed).toFixed(1)}</p>
      </div>
      <p className="text-blue-500 mt-2">Click for full details</p>
    </div>
  );

  const renderPlayerDetails = (player: Player) => (
    <div className="border p-4 rounded shadow">
      <h3 className="font-bold text-xl mb-2">{player.name} - Player Details</h3>
      <p>Position: {player.position}</p>
      <p>Class: {player.classYear}</p>
      <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}"</p>
      <h4 className="font-semibold mt-2">Attributes:</h4>
      <h4 className="font-semibold mt-2">Stats:</h4>
      <ul>
        <li>Games Played: {player.stats.gamesPlayed}</li>
        <li>Points: ({(player.stats.points / player.stats.gamesPlayed).toFixed(1)} PPG)</li>
        <li>Rebounds: ({(player.stats.rebounds / player.stats.gamesPlayed).toFixed(1)} RPG)</li>
        <li>Assists: ({(player.stats.assists / player.stats.gamesPlayed).toFixed(1)} APG)</li>
        <li>Steals: ({(player.stats.steals / player.stats.gamesPlayed).toFixed(1)} SPG)</li>
        <li>Blocks: ({(player.stats.blocks / player.stats.gamesPlayed).toFixed(1)} BPG)</li>
        <li>FG: ({((player.stats.fgm / player.stats.fga) * 100).toFixed(1)}%)</li>
        <li>3PT: ({((player.stats.tpm / player.stats.tpa) * 100).toFixed(1)}%)</li>
        <li>FT: ({((player.stats.ftm / player.stats.fta) * 100).toFixed(1)}%)</li>
      </ul>
      <button 
        onClick={() => setSelectedPlayer(null)}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Back to Team
      </button>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">High School Teams</h1>
      {!teamsGenerated && (
        <div>
          <p>No teams found. Generate teams to see high school players.</p>
          <GenerateTeamsButton onTeamsGenerated={handleTeamsGenerated} setLoading={setLoading} />
        </div>
      )}
      {selectedPlayer ? (
        renderPlayerDetails(selectedPlayer)
      ) : selectedTeam ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Team {selectedTeam}</h2>
          <button 
            onClick={() => setSelectedTeam(null)}
            className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Teams
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recruits[selectedTeam].map(renderPlayerCard)}
          </div>
        </div>
      ) : teamsGenerated && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Object.keys(recruits).map((teamId) => (
            <div key={teamId} className="border p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Team {teamId}</h2>
              <p>{recruits[teamId].length} players</p>
              <button 
                onClick={() => setSelectedTeam(teamId)}
                className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
              >
                View Team
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecruitsPage;