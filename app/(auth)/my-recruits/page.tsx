'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebaseConfig'; // Adjust the import path as needed
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface RecruitData {
  playerId: string;
  points: number;
  recruitingInfo?: { playerId: string }[];
  committed?: boolean;
  teamCommittedTo?: string;
}

const MyRecruitsPage: React.FC = () => {
  const [recruits, setRecruits] = useState<RecruitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<{[key: string]: string}>({});
  const router = useRouter();

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    const fetchRecruits = async (userId: string) => {
      try {
        const team1Ref = doc(db, "users", userId, "teams", "1");
    
        const docSnap = await getDoc(team1Ref);
        if (!docSnap.exists()) {
          setError('Team 1 document not found. Please generate teams first.');
          setLoading(false);
          return;
        }
    
        const teamData = docSnap.data();
        let myRecruits: RecruitData[] = teamData.myRecruits || [];
    
        // Fetch recruiting info for each recruit
        myRecruits = await Promise.all(myRecruits.map(async (recruit) => {
          const parts = recruit.playerId.split('-');
          if (parts.length >= 3) {
            const teamNumber = parts[2];
            const teamRef = doc(db, "users", userId, "recruits", teamNumber);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              if (teamData && Array.isArray(teamData.players)) {
                const player = teamData.players.find((p: any) => p.id === recruit.playerId);
                if (player) {
                  return { 
                    ...recruit, 
                    recruitingInfo: player.recruitingInfo,
                    committed: player.committed,
                    teamCommittedTo: player.teamCommittedTo
                  };
                }
              }
            }
          }
          return recruit;
        }));
    
        setRecruits(myRecruits);
        await fetchPlayerNames(userId, myRecruits);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching recruits: ", error);
        setError('An error occurred while fetching recruits.');
        setLoading(false);
      }
    };

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchRecruits(user.uid);
      } else {
        setError('You must be logged in to view recruits.');
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  const fetchPlayerNames = async (userId: string, recruits: RecruitData[]) => {
    const names: {[key: string]: string} = {};
    for (const recruit of recruits) {
      const parts = recruit.playerId.split('-');
      if (parts.length >= 3) {
        const teamNumber = parts[2];
        const teamRef = doc(db, "users", userId, "recruits", teamNumber);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          if (teamData && Array.isArray(teamData.players)) {
            const player = teamData.players.find((p: any) => p.id === recruit.playerId);
            if (player) {
              names[recruit.playerId] = player.name;
            }
          }
        }
      }
    }
    setPlayerNames(names);
  };

  const handlePlayerClick = (playerId: string) => {
    router.push(`/hsplayer/${playerId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Recruits</h1>
      {recruits.length === 0 ? (
        <p>No recruits found.</p>
      ) : (
        <ul className="space-y-2">
          {recruits.map((recruit) => {
            const isCommittedToUs = recruit.committed && recruit.teamCommittedTo === "1";
            const isCommittedElsewhere = recruit.committed && recruit.teamCommittedTo !== "1";
            
            return (
              <li 
                key={recruit.playerId} 
                className={`border p-2 rounded cursor-pointer hover:bg-gray-100 flex flex-col
                  ${isCommittedToUs ? 'bg-green-100' : ''}
                  ${isCommittedElsewhere ? 'bg-red-100' : ''}`}
                onClick={() => handlePlayerClick(recruit.playerId)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">Player:</span> {playerNames[recruit.playerId] || 'Loading...'}
                    <span className="ml-4 font-semibold">Points:</span> {recruit.points}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Teams:</span> {
                    recruit.recruitingInfo && recruit.recruitingInfo.length > 0
                      ? recruit.recruitingInfo.map(info => info.playerId).join(', ')
                      : 'No teams'
                  }
                </div>
                {recruit.committed && (
                  <div className={`text-sm mt-1 ${isCommittedToUs ? 'text-green-600' : 'text-red-600'}`}>
                    Committed to: {recruit.teamCommittedTo === "1" ? "Us" : `Team ${recruit.teamCommittedTo}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MyRecruitsPage;