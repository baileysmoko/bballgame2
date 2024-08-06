'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import GenerateTeamsButton from '../../GenerateTeamsButton';

interface Player {
  id: string;
  name: string;
  classYear: string;
  height: number;
  position: string;
  attributes: {
    threePoint: number,
    midRange: number,
    closeRange: number,
    freeThrow: number,
    passSteal: number,
    dribbleSteal: number,
    block: number,
    passing: number,
    dribbling: number,
    offensiveRebounding: number,
    defensiveRebounding: number,
    defensiveFoul: number,
    shotIQ: number,
    passingIQ: number,
    createSpace: number,
    defensiveQuickness: number,
    stamina: number
  };
}

const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'bPG', 'bSG', 'bSF', 'bPF', 'bC', 'N/A', 'N/A'];

const YourTeam: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('1');
  const [team, setTeam] = useState<Player[]>([]);
  const [teamsGenerated, setTeamsGenerated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchTeams(user.uid);
      } else {
        setLoading(false);
        setTeamsGenerated(false);
        setTeam([]);
      }
    });

    return () => unsubscribe();
  }, [selectedTeam]);

  const fetchTeams = async (userId: string) => {
    setLoading(true);
    const teamDocRef = doc(collection(db, "users", userId, "teams"), selectedTeam);
    const teamDoc = await getDoc(teamDocRef);
    if (teamDoc.exists()) {
      const data = teamDoc.data();
      if (data && data.players) {
        setTeam(data.players);
        setTeamsGenerated(true);
      }
    }
    setLoading(false);
  };

  const formatHeight = (heightInInches: number) => {
    const roundedHeight = Math.round(heightInInches);
    const feet = Math.floor(roundedHeight / 12);
    const inches = roundedHeight % 12;
    return `${feet}-${inches}`;
  };

  const getRating = (average: number): string => {
    if (average >= 0 && average < 20) return 'None';
    if (average >= 1 && average < 40) return 'Poor';
    if (average >= 2 && average < 60) return 'Fair';
    if (average >= 3 && average < 80) return 'Good';
    if (average >= 4 && average <= 100) return 'Exc';
    return 'Unknown';
  };

  const calculateRatings = (player: Player) => {
    const shooting = (player.attributes.threePoint + player.attributes.midRange + player.attributes.closeRange + player.attributes.freeThrow) / 4;
    const defense = (player.attributes.passSteal + player.attributes.dribbleSteal + player.attributes.block) / 3;
    const hands = (player.attributes.passing + player.attributes.dribbling) / 2;
    const rebounding = (player.attributes.offensiveRebounding + player.attributes.defensiveRebounding) / 2;
    const intelligence = (player.attributes.defensiveFoul + player.attributes.shotIQ + player.attributes.passingIQ) / 3;
    const athleticism = (player.attributes.createSpace + player.attributes.defensiveQuickness + player.attributes.stamina) / 3;

    return {
      shooting: getRating(shooting),
      defense: getRating(defense),
      hands: getRating(hands),
      rebounding: getRating(rebounding),
      intelligence: getRating(intelligence),
      athleticism: getRating(athleticism),
    };
  };

  const handlePlayerClick = (playerId: string) => {
    if (selectedPlayer === null) {
      setSelectedPlayer(playerId);
    } else if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
    } else {
      // Swap players
      const playerIndex1 = team.findIndex(p => p.id === selectedPlayer);
      const playerIndex2 = team.findIndex(p => p.id === playerId);

      if (playerIndex1 !== -1 && playerIndex2 !== -1) {
        const newTeam = [...team];
        [newTeam[playerIndex1], newTeam[playerIndex2]] = [newTeam[playerIndex2], newTeam[playerIndex1]];

        // Update positions
        newTeam.forEach((player, index) => {
          player.position = positions[index];
        });

        setTeam(newTeam);
      }

      setSelectedPlayer(null);
    }
  };

  const updatePositions = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to update positions.');
      return;
    }

    try {
      setLoading(true);
      const teamDocRef = doc(collection(db, "users", user.uid, "teams"), selectedTeam);
      await setDoc(teamDocRef, { players: team }, { merge: true });
      alert('Positions updated successfully!');
    } catch (error) {
      console.error("Error updating positions: ", error);
      alert('An error occurred while updating positions.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamsGenerated = async (teams: any) => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      await fetchTeams(user.uid);
    }
    setLoading(false);
  };

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeam(event.target.value);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <main className="grow">
        <section className="relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="pt-32 pb-12 md:pt-40 md:pb-20">
              <h1 className="text-3xl font-bold mb-4">Your Team</h1>
              {loading ? (
                <p>Loading...</p>
              ) : !auth.currentUser ? (
                <p>Please log in to view your team.</p>
              ) : (
                <>
                  <div className="mt-8">
                    <label htmlFor="team-select" className="mr-2">Select Team:</label>
                    <select id="team-select" value={selectedTeam} onChange={handleTeamChange}>
                      {Array.from({ length: 64 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Team {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!teamsGenerated && (
                    <div className="mt-8">
                      <GenerateTeamsButton
                        onTeamsGenerated={handleTeamsGenerated}
                        setLoading={setLoading}
                      />
                    </div>
                  )}
                  {teamsGenerated && team.length > 0 && (
                    <div className="mt-8">
                      <h2 className="text-2xl font-semibold mb-2">Team {selectedTeam}:</h2>
                      <table className="min-w-full bg-gray-800 rounded-lg">
                        <thead>
                          <tr>
                            <th className="px-4 py-2">Position</th>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Height</th>
                            <th className="px-4 py-2">Class</th>
                            <th className="px-4 py-2">Shooting</th>
                            <th className="px-4 py-2">Defense</th>
                            <th className="px-4 py-2">Hands</th>
                            <th className="px-4 py-2">Rebounding</th>
                            <th className="px-4 py-2">Intelligence</th>
                            <th className="px-4 py-2">Athleticism</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.map((player, index) => {
                            const ratings = calculateRatings(player);
                            return (
                              <tr
                                key={player.id}
                                className={`border-t border-gray-700 cursor-pointer ${
                                  selectedPlayer === player.id ? 'bg-blue-600' : ''
                                }`}
                                onClick={() => handlePlayerClick(player.id)}
                              >
                                <td className="px-4 py-2">{player.position}</td>
                                <td className="px-4 py-2">{player.name}</td>
                                <td className="px-4 py-2">{formatHeight(player.height)}</td>
                                <td className="px-4 py-2">{player.classYear}</td>
                                <td className="px-4 py-2">{ratings.shooting}</td>
                                <td className="px-4 py-2">{ratings.defense}</td>
                                <td className="px-4 py-2">{ratings.hands}</td>
                                <td className="px-4 py-2">{ratings.rebounding}</td>
                                <td className="px-4 py-2">{ratings.intelligence}</td>
                                <td className="px-4 py-2">{ratings.athleticism}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mt-4">
                        <button
                          onClick={updatePositions}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Update Positions
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default YourTeam;
