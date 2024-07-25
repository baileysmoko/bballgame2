'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../../firebaseConfig'; // Adjust the path as needed
import { doc, getDoc } from 'firebase/firestore';

interface Player {
  name: string;
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
}

interface Team {
  name: string;
  players: Player[];
}

interface TeamStatsPageProps {
  params: {
    id: string;
  }
}

const TeamStatsPage: React.FC<TeamStatsPageProps> = ({ params }) => {
  const { id } = params;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const teamDocRef = doc(db, 'users', auth.currentUser.uid, 'teams', id);
        const teamDoc = await getDoc(teamDocRef);

        if (teamDoc.exists()) {
          const data = teamDoc.data() as Team;
          setTeam(data);
        } else {
          setError('No team data found for this ID.');
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
        setError('Failed to fetch team data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!team) {
    return <div>No team data available.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{team.name} Stats</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-right">GP</th>
              <th className="px-4 py-2 text-right">PPG</th>
              <th className="px-4 py-2 text-right">RPG</th>
              <th className="px-4 py-2 text-right">APG</th>
              <th className="px-4 py-2 text-right">SPG</th>
              <th className="px-4 py-2 text-right">BPG</th>
              <th className="px-4 py-2 text-right">FG%</th>
              <th className="px-4 py-2 text-right">3P%</th>
              <th className="px-4 py-2 text-right">FT%</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((player, index) => (
              <tr key={index} className="border-b">
                <td className="px-4 py-2">{player.name}</td>
                <td className="px-4 py-2 text-right">{player.stats.gamesPlayed}</td>
                <td className="px-4 py-2 text-right">{(player.stats.points / player.stats.gamesPlayed).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{(player.stats.rebounds / player.stats.gamesPlayed).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{(player.stats.assists / player.stats.gamesPlayed).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{(player.stats.steals / player.stats.gamesPlayed).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{(player.stats.blocks / player.stats.gamesPlayed).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{((player.stats.fgm / player.stats.fga) * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right">{((player.stats.tpm / player.stats.tpa) * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right">{((player.stats.ftm / player.stats.fta) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamStatsPage;