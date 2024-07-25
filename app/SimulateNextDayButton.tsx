import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import simulateNextGame from './simulateGame';
import { SimulateNextDayButtonProps, Game, Player, SimulationResult } from './types';

const SimulateNextDayButton: React.FC<SimulateNextDayButtonProps> = ({ userId, onSimulationComplete }) => {
  const [loading, setLoading] = useState(false);

  const simulateNextDay = async () => {
    setLoading(true);
    try {
      // Fetch the current day
      const currentDayDocRef = doc(db, "users", userId, "currentDay", "day");
      const currentDayDoc = await getDoc(currentDayDocRef);
      let currentDay = 1;
      if (currentDayDoc.exists()) {
        currentDay = currentDayDoc.data().day || 1;
      }

      // Fetch the schedule for the current day
      const scheduleDocRef = doc(db, "users", userId, "schedule", currentDay.toString());
      const scheduleDoc = await getDoc(scheduleDocRef);
      const schedule = scheduleDoc.data();

      if (!schedule) {
        throw new Error('Schedule not found for the current day');
      }

      // Reference to the teams collection
      const teamsCollectionRef = collection(db, "users", userId, "teams");
      // Reference to the recruits collection (for high school teams)
      const recruitsCollectionRef = collection(db, "users", userId, "recruits");

      // Simulate games for the current day (college teams)
      const simulatedGames = await Promise.all(Object.entries(schedule).map(async ([matchId, match]) => {
        const [homeTeamId, awayTeamId] = match as [string, string];
        
        // Fetch home team
        const homeTeamDoc = await getDoc(doc(teamsCollectionRef, homeTeamId));
        const homeTeam = homeTeamDoc.data()?.players as Player[];

        // Fetch away team
        const awayTeamDoc = await getDoc(doc(teamsCollectionRef, awayTeamId));
        const awayTeam = awayTeamDoc.data()?.players as Player[];

        if (!homeTeam || !awayTeam) {
          throw new Error(`Team data not found for match ${matchId}`);
        }

        const simulationResult: SimulationResult = simulateNextGame(homeTeam, awayTeam);

        // Update home team data
        await updateDoc(doc(teamsCollectionRef, homeTeamId), {
          players: simulationResult.updatedHomePlayers
        });

        // Update away team data
        await updateDoc(doc(teamsCollectionRef, awayTeamId), {
          players: simulationResult.updatedAwayPlayers
        });

        const gameData = {
          matchId,
          homeTeam: homeTeamId,
          awayTeam: awayTeamId,
          homeScore: simulationResult.boxScore.homeTeam.score,
          awayScore: simulationResult.boxScore.awayTeam.score,
          boxScore: simulationResult.boxScore,
        };

        // Only include play-by-play data if team "1" is involved
        if (homeTeamId === "1" || awayTeamId === "1") {
          return {
            ...gameData,
            playByPlay: simulationResult.playByPlay
          };
        }

        return gameData;
      }));

      // Update the game results in a subcollection for the current day (college games)
      const gameResultsDayCollectionRef = collection(db, "users", userId, "gameResults", currentDay.toString(), "games");
      for (const game of simulatedGames) {
        await setDoc(doc(gameResultsDayCollectionRef, game.matchId), game);
      }

      // Simulate high school games using the same schedule
      await Promise.all(Object.entries(schedule).map(async ([matchId, match]) => {
        const [homeTeamId, awayTeamId] = match as [string, string];
        
        // Fetch home team (high school)
        const homeTeamDoc = await getDoc(doc(recruitsCollectionRef, homeTeamId));
        const homeTeam = homeTeamDoc.data()?.players as Player[];

        // Fetch away team (high school)
        const awayTeamDoc = await getDoc(doc(recruitsCollectionRef, awayTeamId));
        const awayTeam = awayTeamDoc.data()?.players as Player[];

        if (homeTeam && awayTeam) {
          const simulationResult: SimulationResult = simulateNextGame(homeTeam, awayTeam);

          // Update high school home team data (only stats)
          await updateDoc(doc(recruitsCollectionRef, homeTeamId), {
            players: simulationResult.updatedHomePlayers.map(player => ({
              ...player,
              stats: player.stats // Only update the stats
            }))
          });

          // Update high school away team data (only stats)
          await updateDoc(doc(recruitsCollectionRef, awayTeamId), {
            players: simulationResult.updatedAwayPlayers.map(player => ({
              ...player,
              stats: player.stats // Only update the stats
            }))
          });
        }
      }));

      // Update the current day
      await setDoc(currentDayDocRef, { day: currentDay + 1 });

      onSimulationComplete();
    } catch (error: any) {
      console.error("Error simulating games:", error);
      alert(`An error occurred while simulating games: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={simulateNextDay}
      disabled={loading}
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      {loading ? 'Simulating...' : 'Simulate Next Day'}
    </button>
  );
};

export default SimulateNextDayButton;