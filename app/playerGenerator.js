import { db } from './firebaseConfig';
import { collection, doc, setDoc } from 'firebase/firestore'; 

async function generatePlayers(userId) {
  const players = [];

  for (let i = 1; i <= 240; i++) {
    const player = {
      id: i,
      name: `Player ${i}`,
      stats: {
        health: 100,
        strength: 10,
        speed: 10
      }
    };

    players.push(player);

    // Save each player to Firestore under the user's collection
    const playerDocRef = doc(collection(db, 'users', userId, 'players'), `player${i}`);
    await setDoc(playerDocRef, player);
  }

  return players;
}

export default generatePlayers;