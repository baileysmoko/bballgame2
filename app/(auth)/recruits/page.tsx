'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import GenerateTeamsButton from '../../GenerateTeamsButton';
import { useRouter } from 'next/navigation';

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
}


interface TeamData {
  recruitingPoints: number;
  pendingRecruitingActions: Array<{ playerId: string; points: number }>;
}

const RecruitsPage: React.FC = () => {
  const [recruits, setRecruits] = useState<{ [key: string]: Player[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teamsGenerated, setTeamsGenerated] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number>(0);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchRecruits(user.uid);
        fetchTeamData(user.uid);
      } else {
        setLoading(false);
        setRecruits({});
        setTeamsGenerated(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  const assignRecruitingPoints = async (player: Player) => {
    if (!auth.currentUser) {
      alert('You must be logged in to assign recruiting points.');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const team1Ref = doc(db, "users", userId, "teams", "1");

      // Check if the document exists
      const docSnap = await getDoc(team1Ref);
      if (!docSnap.exists()) {
        console.error("Team 1 document does not exist");
        alert('Team 1 document not found. Please generate teams first.');
        return;
      }

      const existingActions = docSnap.data().pendingRecruitingActions || [];

      // Remove any existing action for the same player
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
      if (error instanceof Error) {
        alert(`An error occurred while assigning the recruiting points: ${error.message}`);
      } else {
        alert('An unknown error occurred while assigning the recruiting points.');
      }
    }
  };

  const fetchRecruits = async (userId: string) => {
    try {
      const recruitsCollectionRef = collection(db, "users", userId, "recruits");
      const querySnapshot = await getDocs(recruitsCollectionRef);
      const fetchedRecruits: { [key: string]: Player[] } = {};
  
      querySnapshot.forEach((doc) => {
        const data = doc.data().players;
        fetchedRecruits[doc.id] = data.map((player: Player) => ({
          ...player,
          committed: player.committed,
          teamCommittedTo: player.teamCommittedTo,
        }));
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

  const selectPlayer = (player: Player) => {
    router.push(`/hsplayer/${player.id}`);
  };

  const renderPlayerCard = (player: Player) => {
    const isCommittedToUs = player.committed && player.teamCommittedTo === "1";
    const isCommittedElsewhere = player.committed && player.teamCommittedTo !== "1";
  
    return (
      <div
        key={player.id}
        className={`border p-4 rounded shadow cursor-pointer ${isCommittedToUs ? 'bg-green-100' : ''} ${isCommittedElsewhere ? 'bg-red-100' : ''}`}
        onClick={() => selectPlayer(player)}
      >
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
  };
  

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
      {selectedTeam ? (
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
