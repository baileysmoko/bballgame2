// helpers.tsx

import { db } from './firebaseConfig'; // Adjust the path if needed
import { collection, doc, writeBatch } from "firebase/firestore";

export const generateAndUploadSchedule = async (userId: string, teamNames: string[]) => {
  const scheduleCollectionRef = collection(db, "users", userId, "schedule");
  const gameDays = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27];
  const matchupsPerDay = 32; // Exactly 32 matches per day

  for (const day of gameDays) {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0)); // Allow UI to update

    const daySchedule = generateDaySchedule(teamNames, day, matchupsPerDay);
    
    const batch = writeBatch(db);
    batch.set(doc(scheduleCollectionRef, day.toString()), daySchedule);
    await batch.commit();
  }
};

const generateDaySchedule = (teamNames: string[], day: number, matchupsPerDay: number) => {
  const daySchedule: { [matchup: string]: [string, string] } = {};
  const availableTeams = [...teamNames];

  for (let match = 1; match <= matchupsPerDay; match++) {
    if (availableTeams.length < 2) {
      console.warn(`Not enough teams left for day ${day}, match ${match}`);
      break;
    }

    const team1Index = Math.floor(Math.random() * availableTeams.length);
    const team1 = availableTeams.splice(team1Index, 1)[0];

    const team2Index = Math.floor(Math.random() * (availableTeams.length - 1));
    const team2 = availableTeams.splice(team2Index, 1)[0];

    daySchedule[`Match${match}`] = [team1, team2];
  }

  return daySchedule;
};