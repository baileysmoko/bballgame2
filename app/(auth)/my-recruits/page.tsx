'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebaseConfig'; // Adjust the import path as needed
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface RecruitData {
  playerId: string;
  points: number;
}

const MyRecruitsPage: React.FC = () => {
  const [recruits, setRecruits] = useState<RecruitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const myRecruits: RecruitData[] = teamData.myRecruits || [];
        setRecruits(myRecruits);
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
          {recruits.map((recruit) => (
            <li key={recruit.playerId} className="border p-2 rounded">
              <span className="font-semibold">Player ID:</span> {recruit.playerId}
              <span className="ml-4 font-semibold">Points:</span> {recruit.points}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyRecruitsPage;
