'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../../../firebaseConfig'; // Adjust the path as needed
import { doc, getDoc } from 'firebase/firestore';

interface BoxScorePlayer {
  name: string;
  minutes: number;
  points: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
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

interface BoxScore {
  homeTeam: {
    name: string;
    score: number;
    players: BoxScorePlayer[];
  };
  awayTeam: {
    name: string;
    score: number;
    players: BoxScorePlayer[];
  };
}

interface BoxScorePageProps {
  params: {
    day: string;
    matchID: string;
  }
}

const BoxScorePage: React.FC<BoxScorePageProps> = ({ params }) => {
  const { day, matchID } = params;
  const [boxScore, setBoxScore] = useState<BoxScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoxScore = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const gameDocRef = doc(db, 'users', auth.currentUser.uid, 'gameResults', day, 'games', matchID);
        const gameDoc = await getDoc(gameDocRef);

        if (gameDoc.exists()) {
          const data = gameDoc.data();
          if (data && data.boxScore) {
            setBoxScore(data.boxScore);
          } else {
            setError('Box score data not found in the game document.');
          }
        } else {
          setError('No game data found for this match.');
        }
      } catch (error) {
        console.error('Error fetching box score data:', error);
        setError('Failed to fetch box score data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBoxScore();
  }, [day, matchID]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!boxScore) {
    return <div>No box score data available for this match.</div>;
  }

  const renderTeamBoxScore = (team: BoxScore['homeTeam'] | BoxScore['awayTeam']) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-2">{team.name} - {team.score} points</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 text-left">Player</th>
            <th className="border p-2 text-right">MIN</th>
            <th className="border p-2 text-right">PTS</th>
            <th className="border p-2 text-right">REB</th>
            <th className="border p-2 text-right">OR</th>
            <th className="border p-2 text-right">DR</th>
            <th className="border p-2 text-right">AST</th>
            <th className="border p-2 text-right">STL</th>
            <th className="border p-2 text-right">BLK</th>
            <th className="border p-2 text-right">FG</th>
            <th className="border p-2 text-right">3P</th>
            <th className="border p-2 text-right">FT</th>
          </tr>
        </thead>
        <tbody>
          {team.players.map((player, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
              <td className="border p-2">{player.name}</td>
              <td className="border p-2 text-right">{player.minutes}</td>
              <td className="border p-2 text-right">{player.points}</td>
              <td className="border p-2 text-right">{player.offensiveRebounds}</td>
              <td className="border p-2 text-right">{player.defensiveRebounds}</td>
              <td className="border p-2 text-right">{player.offensiveRebounds + player.defensiveRebounds}</td>
              <td className="border p-2 text-right">{player.assists}</td>
              <td className="border p-2 text-right">{player.steals}</td>
              <td className="border p-2 text-right">{player.blocks}</td>
              <td className="border p-2 text-right">{player.fgm}-{player.fga}</td>
              <td className="border p-2 text-right">{player.tpm}-{player.tpa}</td>
              <td className="border p-2 text-right">{player.ftm}-{player.fta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Box Score</h1>
      {renderTeamBoxScore(boxScore.homeTeam)}
      {renderTeamBoxScore(boxScore.awayTeam)}
    </div>
  );
};

export default BoxScorePage;