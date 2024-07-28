import React from 'react';
import { db, auth } from './firebaseConfig'; // Adjust the import path as needed
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

interface RunRecruitsProps {
  onRecruitsProcessed: () => void;
}

interface RecruitData {
  playerId: string;
  points: number;
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
      const team1Ref = doc(db, "users", userId, "teams", "1");

      // Get the current team data
      const docSnap = await getDoc(team1Ref);
      if (!docSnap.exists()) {
        alert('Team 1 document not found. Please generate teams first.');
        return;
      }

      const teamData = docSnap.data();
      const pendingActions: RecruitData[] = teamData.pendingRecruitingActions || [];
      const currentRecruits: RecruitData[] = teamData.myRecruits || [];

      // Process each pending action
      const updatedRecruits: RecruitData[] = [...currentRecruits];
      for (const action of pendingActions) {
        const existingRecruitIndex = updatedRecruits.findIndex(
          (recruit) => recruit.playerId === action.playerId
        );

        if (existingRecruitIndex !== -1) {
          // Update existing recruit's points
          updatedRecruits[existingRecruitIndex].points += action.points;
        } else {
          // Add new recruit
          updatedRecruits.push(action);
        }
      }

      // Update the document with the new myRecruits array and clear pendingRecruitingActions
      await updateDoc(team1Ref, {
        myRecruits: updatedRecruits,
        pendingRecruitingActions: [],
        recruitingPoints: 150 // Reset recruiting points to 150
      });

      alert('Recruits processed successfully!');
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
      Process Recruits
    </button>
  );
};

export default RunRecruits;