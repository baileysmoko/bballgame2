import React from 'react';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch, arrayUnion } from "firebase/firestore";

interface RunRecruitsProps {
  onRecruitsProcessed: () => void;
}

interface RecruitData {
  playerId: string;
  points: number;
  offeredScholarship?: boolean;
}

interface PlayerDetails {
  id: string;
  name: string;
  classYear: string; // Add this line
  recruitingInfo?: RecruitData[];
  committed: boolean;
  teamCommittedTo: string;
  recruitDate: {
    year: "Junior" | "Senior";
    day: number;
  };
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
      
      // Fetch current day
      const currentDayDoc = await getDoc(doc(db, "users", userId, "currentDay", "day"));
      const currentDay = currentDayDoc.data()?.day || 1;

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
      const commitUpdates: { [teamId: string]: { juniorCommits: string[], seniorCommits: string[] } } = {};
      
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
            if (action.offeredScholarship) {
              updatedRecruits[existingRecruitIndex].offeredScholarship = true;
            }
          } else {
            updatedRecruits.push({
              ...action,
              offeredScholarship: action.offeredScholarship || false
            });
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
                  if (action.offeredScholarship) {
                    player.recruitingInfo[existingActionIndex].offeredScholarship = true;
                  }
                } else {
                  player.recruitingInfo.push({
                    playerId: teamNumber,
                    points: action.points,
                    offeredScholarship: action.offeredScholarship || false
                  });
                }

                // Check if it's time for the player to commit
                if (player.recruitDate.day === currentDay && !player.committed) {
                  const teamsOfferedScholarship = player.recruitingInfo
                    .filter(info => info.offeredScholarship)
                    .map(info => info.playerId);
                  
                  if (teamsOfferedScholarship.length > 0) {
                    const randomTeam = teamsOfferedScholarship[Math.floor(Math.random() * teamsOfferedScholarship.length)];
                    player.committed = true;
                    player.teamCommittedTo = randomTeam;
                  }
                }
              }
            }
          }
          commitUpdates[teamNumber] = { juniorCommits: [], seniorCommits: [] };
        }
  
        // Update team document
        batch.update(teamDoc.ref, {
          myRecruits: updatedRecruits,
          pendingRecruitingActions: [],
          recruitingPoints: 150
        });
      }
      for (const recruitTeamNumber in recruitDocs) {
        const recruitTeamData = recruitDocs[recruitTeamNumber];
        
        if (recruitTeamData && Array.isArray(recruitTeamData.players)) {
          if (!updatedRecruitPlayers[recruitTeamNumber]) {
            updatedRecruitPlayers[recruitTeamNumber] = [...recruitTeamData.players];
          }
      
          for (let i = 0; i < updatedRecruitPlayers[recruitTeamNumber].length; i++) {
            const player = updatedRecruitPlayers[recruitTeamNumber][i];
            
            // Check if it's time for the player to commit
            if (player.recruitDate.day === currentDay && !player.committed) {
              if (!player.recruitingInfo) {
                player.recruitingInfo = [];
              }
      
              const teamsOfferedScholarship = player.recruitingInfo
                .filter(info => info.offeredScholarship)
                .map(info => info.playerId);
              
              if (teamsOfferedScholarship.length > 0) {
                const randomTeam = teamsOfferedScholarship[Math.floor(Math.random() * teamsOfferedScholarship.length)];
                player.committed = true;
                player.teamCommittedTo = randomTeam;
      
                // Add player to appropriate commit set
                if (player.classYear === "Junior") {
                  if (!commitUpdates[randomTeam]) {
                    commitUpdates[randomTeam] = { juniorCommits: [], seniorCommits: [] };
                  }
                  commitUpdates[randomTeam].juniorCommits.push(player.id);
                } else if (player.classYear === "Senior") {
                  if (!commitUpdates[randomTeam]) {
                    commitUpdates[randomTeam] = { juniorCommits: [], seniorCommits: [] };
                  }
                  commitUpdates[randomTeam].seniorCommits.push(player.id);
                }
              }
            }
          }
        }
      }
      // Update recruit team documents
      for (const [recruitTeamNumber, players] of Object.entries(updatedRecruitPlayers)) {
        const recruitTeamRef = doc(db, "users", userId, "recruits", recruitTeamNumber);
        batch.update(recruitTeamRef, { players });
      }
      
      for (const [teamNumber, updates] of Object.entries(commitUpdates)) {
        const teamRef = doc(db, "users", userId, "teams", teamNumber);
        const teamDoc = await getDoc(teamRef);
        const teamData = teamDoc.data();
        
        batch.update(teamRef, {
          juniorCommits: [...(teamData?.juniorCommits || []), ...updates.juniorCommits],
          seniorCommits: [...(teamData?.seniorCommits || []), ...updates.seniorCommits]
        });
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