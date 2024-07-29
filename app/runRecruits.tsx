import React from 'react';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch, runTransaction } from "firebase/firestore";

interface RunRecruitsProps {
  onRecruitsProcessed: () => void;
}

interface RecruitData {
  playerId: string;
  points: number;
}

interface PlayerDetails {
  id: string;
  name: string;
  recruitingInfo?: RecruitData[];
}

interface UpdatedRecruitPlayers {
  [key: string]: PlayerDetails[];
}

const RunRecruits: React.FC<RunRecruitsProps> = ({ onRecruitsProcessed }) => {
  const processRecruits = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to process recruits.');
      return;
    }

    try {
      const userId = user.uid;
      
      // Fetch all team data at once
      const teamsRef = collection(db, "users", userId, "teams");
      const teamsSnap = await getDocs(teamsRef);
      const teamDocs = teamsSnap.docs;

      // Fetch all recruit team data at once
      const recruitsRef = collection(db, "users", userId, "recruits");
      const recruitsSnap = await getDocs(recruitsRef);
      const recruitDocs = recruitsSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as { [key: string]: any });

      const batch = writeBatch(db);

      const updatedRecruitPlayers: UpdatedRecruitPlayers = {};

      for (const teamDoc of teamDocs) {
        const teamData = teamDoc.data();
        const teamNumber = teamDoc.id;
        const pendingActions: RecruitData[] = teamData.pendingRecruitingActions || [];
        const currentRecruits: RecruitData[] = teamData.myRecruits || [];

        const updatedRecruits: RecruitData[] = [...currentRecruits];

        for (const action of pendingActions) {
          const existingRecruitIndex = updatedRecruits.findIndex(
            (recruit) => recruit.playerId === action.playerId
          );

          if (existingRecruitIndex !== -1) {
            updatedRecruits[existingRecruitIndex].points += action.points;
          } else {
            updatedRecruits.push(action);
          }

          const parts = action.playerId.split('-');
          if (parts.length >= 3) {
            const recruitTeamNumber = parts[2];
            const recruitTeamData = recruitDocs[recruitTeamNumber];
            
            if (recruitTeamData && Array.isArray(recruitTeamData.players)) {
              const playerIndex = recruitTeamData.players.findIndex((p: PlayerDetails) => p.id === action.playerId);
              if (playerIndex !== -1) {
                if (!updatedRecruitPlayers[recruitTeamNumber]) {
                  updatedRecruitPlayers[recruitTeamNumber] = [...recruitTeamData.players];
                }
                const player = updatedRecruitPlayers[recruitTeamNumber][playerIndex];
                if (!player.recruitingInfo) {
                  player.recruitingInfo = [];
                }
                const existingActionIndex = player.recruitingInfo.findIndex(
                  (info: RecruitData) => info.playerId === teamNumber
                );
                if (existingActionIndex !== -1) {
                  player.recruitingInfo[existingActionIndex].points += action.points;
                } else {
                  player.recruitingInfo.push({ playerId: teamNumber, points: action.points });
                }
              }
            }
          }
        }

        // Update team document
        batch.update(teamDoc.ref, {
          myRecruits: updatedRecruits,
          pendingRecruitingActions: [],
          recruitingPoints: 150
        });
      }

      // Update recruit team documents
      for (const [recruitTeamNumber, players] of Object.entries(updatedRecruitPlayers)) {
        const recruitTeamRef = doc(db, "users", userId, "recruits", recruitTeamNumber);
        batch.update(recruitTeamRef, { players });
      }

      // Commit all updates in a single batch
      await batch.commit();

      alert('Recruits processed successfully for all teams!');
      onRecruitsProcessed();
    } catch (error) {
      console.error("Error processing recruits: ", error);
      if (error instanceof Error) {
        alert(`An error occurred while processing recruits: ${error.message}`);
      } else {
        alert('An unknown error occurred while processing recruits.');
      }
    }
  };

  return (
    <button
      onClick={processRecruits}
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      Process Recruits for All Teams
    </button>
  );
};

export default RunRecruits;