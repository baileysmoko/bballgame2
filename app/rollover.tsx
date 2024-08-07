import React from 'react';
import { db, auth } from './firebaseConfig';
import { collection, doc, writeBatch, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { randomNormal, randomUniform } from 'd3-random';

interface RolloverButtonProps {
  onRolloverComplete: () => void;
}
interface Recruit {
    playerId: string;
    points: number;
    offeredScholarship: boolean;
  }

interface Player {
    id: string;
    name: string;
    classYear: string;
    height: number;
    position: string;
    committed?: boolean;
    teamCommittedTo?: string;
    attributes: {
        threePoint: number;
        midRange: number;
        closeRange: number;
        freeThrow: number;
        passSteal: number;
        dribbleSteal: number;
        block: number;
        passing: number;
        dribbling: number;
        offensiveRebounding: number;
        defensiveRebounding: number;
        defensiveFoul: number;
        shotIQ: number;
        passingIQ: number;
        createSpace: number;
        defensiveQuickness: number;
        stamina: number;
    };
    totalAttributes?: number;
    stats: {
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
    };
    recruitingInfo?: any[];
    recruitDate?: {
        year: "Junior" | "Senior";
        day: number;
    };
}
interface HighSchoolPlayer extends Player {
    committed: boolean;
    teamCommittedTo: string;
    recruitDate: {
      year: "Junior" | "Senior";
      day: number;
    };
    scout: number;
    scoutedAttributes: {
      [key: string]: number;
    };
  }
const sortPlayersByTotalAttributes = (players: Player[]) => {
    return players.sort((a, b) => (b.totalAttributes || 0) - (a.totalAttributes || 0));
};
const sortPlayersByHeight = (players: Player[]) => {
    return players.sort((a, b) => a.height - b.height);
};

const setPositions = (players: Player[]) => {
    const starters = players.slice(0, 5);
    const backups = players.slice(5, 10);
    const extras = players.slice(10);
    const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
    const backupPositionOrder = ['bPG', 'bSG', 'bSF', 'bPF', 'bC'];

    sortPlayersByHeight(starters).forEach((player, index) => {
        player.position = positionOrder[index];
    });

    sortPlayersByHeight(backups).forEach((player, index) => {
        player.position = backupPositionOrder[index];
    });

    extras.forEach(player => {
        player.position = 'N/A';
    });

    return [...starters, ...backups, ...extras];
};

const RolloverButton: React.FC<RolloverButtonProps> = ({ onRolloverComplete }) => {
    const firstNames = ["Michael", "LeBron", "Kobe", "Stephen", "Kevin", "Shaquille", "Tim", "Magic", "Larry", "Kareem"];
    const lastNames = ["Jordan", "James", "Bryant", "Curry", "Durant", "O'Neal", "Duncan", "Johnson", "Bird", "Abdul-Jabbar"];

    const generateRandomName = () => {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        return `${firstName} ${lastName}`;
    };
    const generateScoutValue = (classYear: string) => {
        let scoutValue;
        switch (classYear) {
          case 'Freshman':
            scoutValue = randomUniform(10, 20)();
            break;
          case 'Sophomore':
            scoutValue = randomUniform(6.7, 16.7)();
            break;
          case 'Junior':
            scoutValue = randomUniform(3.3, 13.3)();
            break;
          case 'Senior':
            scoutValue = randomUniform(0, 10)();
            break;
          default:
            scoutValue = 0;
            break;
        }
        return scoutValue;
      };
      
      const generateScoutedAttributes = (attributes: { [key: string]: number }, scout: number) => {
        const scoutedAttributes: { [key: string]: number } = {};
        for (const [key, value] of Object.entries(attributes)) {
          const scoutedValue = randomUniform(value - scout, value + scout)();
          scoutedAttributes[key] = Math.max(0, Math.min(100, scoutedValue)); // Ensure values are between 0 and 100
        }
        return scoutedAttributes;
      };
      const calculateTotalAttributes = (attributes: Player['attributes']): number => {
        return Object.values(attributes).reduce((sum, value) => sum + value, 0);
      };

    const generateRandomAttributes = () => {
        return {
            threePoint: Math.random() * 75,
            midRange: Math.random() * 75,
            closeRange: Math.random() * 75,
            freeThrow: Math.random() * 75,
            passSteal: Math.random() * 75,
            dribbleSteal: Math.random() * 75,
            block: Math.random() * 75,
            passing: Math.random() * 75,
            dribbling: Math.random() * 75,
            offensiveRebounding: Math.random() * 75,
            defensiveRebounding: Math.random() * 75,
            defensiveFoul: Math.random() * 75,
            shotIQ: Math.random() * 75,
            passingIQ: Math.random() * 75,
            createSpace: Math.random() * 75,
            defensiveQuickness: Math.random() * 75,
            stamina: Math.random() * 75
        };
    };

    const generateInitialStats = () => ({
        gamesPlayed: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fgm: 0,
        fga: 0,
        tpm: 0,
        tpa: 0,
        ftm: 0,
        fta: 0,
    });

    const getNewScoutValue = (classYear: string): number => {
        switch (classYear) {
          case 'Sophomore':
            return randomUniform(6.7, 16.7)();
          case 'Junior':
            return randomUniform(3.3, 13.3)();
          case 'Senior':
            return randomUniform(0, 10)();
          default:
            return 0;
        }
      };

    const getRandomIncrease = () => Math.random() * 8; // 0 to 8
    const getRandomHeightIncrease = () => Math.random() * 5;

    const generateFreshmanClass = () => {
        const normalDistribution = randomNormal(68, 3);
        const height = Math.max(60, Math.min(91, normalDistribution())); // Between 5'0" and 7'0"
    
        const baseAttributes = generateRandomAttributes();
        const scout = generateScoutValue('Freshman');
        const scoutedAttributes = generateScoutedAttributes(baseAttributes, scout);
    
        const player: HighSchoolPlayer = {
            id: '', // This will be set later
            name: generateRandomName(),
            classYear: "Freshman",
            height: Math.round(height),
            position: '',
            attributes: baseAttributes,
            stats: generateInitialStats(),
            recruitingInfo: [],
            committed: false,
            teamCommittedTo: '',
            recruitDate: {
                year: "Junior",
                day: (Math.floor(Math.random() * 10) + 1) * 3 + 1
            },
            scout: scout,
            scoutedAttributes: scoutedAttributes
        };
    
        player.totalAttributes = Object.values(player.attributes).reduce((sum, value) => sum + value, 0);
        return player;
    };

    const handleRollover = async () => {
        const user = auth.currentUser;
        if (!user) {
          alert('You must be logged in to perform rollover.');
          return;
        }
      
        try {
          const userId = user.uid;
          const batch = writeBatch(db);
      
          // Fetch all recruit teams
          const recruitsRef = collection(db, "users", userId, "recruits");
          const recruitsSnap = await getDocs(recruitsRef);
      
          // Fetch all college teams
          const teamsRef = collection(db, "users", userId, "teams");
          const teamsSnap = await getDocs(teamsRef);
      
          const teamCommitCounts: { [key: string]: number } = {};
          const teamSeniorCommits: { [key: string]: string[] } = {};
      
          // Initialize commit counts and seniorCommits for each team
          teamsSnap.docs.forEach(teamDoc => {
            const teamData = teamDoc.data();
            const teamId = teamDoc.id;
            teamCommitCounts[teamId] = (teamData.juniorCommits?.length || 0) + (teamData.seniorCommits?.length || 0);
            teamSeniorCommits[teamId] = teamData.seniorCommits || [];
          });
      
          // Create a map to store the ID changes
          const idChangeMap: { [oldId: string]: string } = {};
      
          // First, handle all senior commitments
          for (const recruitDoc of recruitsSnap.docs) {
            const recruitData = recruitDoc.data();
            let updatedPlayers = [...recruitData.players];
      
            // Handle uncommitted seniors
            updatedPlayers = updatedPlayers.map((player: Player) => {
              if (player.classYear === "Senior" && !player.committed) {
                // Find teams with available spots
                const availableTeams = Object.entries(teamCommitCounts)
                  .filter(([_, commitCount]) => commitCount < 3)
                  .map(([teamId]) => teamId);
      
                if (availableTeams.length > 0) {
                  const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
                  player.committed = true;
                  player.teamCommittedTo = randomTeam;
                  teamCommitCounts[randomTeam]++;
                  teamSeniorCommits[randomTeam].push(player.id);
                }
              }
              return player;
            });
      
            // Update the recruit team document
            batch.update(recruitDoc.ref, { players: updatedPlayers });
          }
      
// Now, update class years and attributes for all players
for (const recruitDoc of recruitsSnap.docs) {
    const recruitData = recruitDoc.data();
    let updatedPlayers = [...recruitData.players];
  
    // Remove seniors and update remaining players
    updatedPlayers = updatedPlayers.filter((player: HighSchoolPlayer) => player.classYear !== "Senior")
    .map((player: HighSchoolPlayer) => {
      let newClassYear = player.classYear;
      if (player.classYear === "Junior") newClassYear = "Senior";
      else if (player.classYear === "Sophomore") newClassYear = "Junior";
      else if (player.classYear === "Freshman") newClassYear = "Sophomore";
  
      // Update the ID
      const idParts = player.id.split('-');
      idParts[3] = newClassYear;
      const newId = idParts.join('-');
  
      // Store the ID change
      idChangeMap[player.id] = newId;
  
      // Increase attributes randomly
      const updatedAttributes = Object.fromEntries(
        Object.entries(player.attributes).map(([key, value]) => {
          return [key, Math.min(value + getRandomIncrease(), 100)];
        })
      ) as Player['attributes'];
  
      // Calculate new total attributes
      const newTotalAttributes = calculateTotalAttributes(updatedAttributes);
  
      // Increase height for all recruits
      let newHeight = Math.min(player.height + getRandomHeightIncrease(), 91);
  
      // Update scout value
      const newScout = getNewScoutValue(newClassYear);
  
      // Update scouted attributes
      const newScoutedAttributes = generateScoutedAttributes(updatedAttributes, newScout);
  
      return {
        ...player,
        id: newId,
        classYear: newClassYear,
        attributes: updatedAttributes,
        height: newHeight,
        scout: newScout,
        scoutedAttributes: newScoutedAttributes,
        totalAttributes: newTotalAttributes,
      };
    });
  
    // Generate new freshmen
    const newFreshmen = Array.from({ length: 3 }, (_, i) => {
      const freshman = generateFreshmanClass();
      freshman.id = `hs-player-${recruitDoc.id}-Freshman-${i + 1}`;
      return freshman;
    });
  
    updatedPlayers = [...updatedPlayers, ...newFreshmen];
  
    // Sort players by total attributes
    updatedPlayers = sortPlayersByTotalAttributes(updatedPlayers);
  
    // Set positions for players
    updatedPlayers = setPositions(updatedPlayers);
  
    // Update the recruit team document
    batch.update(recruitDoc.ref, { players: updatedPlayers });
  }
      
          // Update all team documents with new seniorCommits and perform class year changes
          for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();
            let updatedPlayers: Player[] = teamData.players || [];
          
            // Remove seniors
            updatedPlayers = updatedPlayers.filter((player: Player) => player.classYear !== "Senior");
          
            // Update for college teams
            updatedPlayers = updatedPlayers.map((player: Player) => {
                let newClassYear = player.classYear;
                if (player.classYear === "Junior") newClassYear = "Senior";
                else if (player.classYear === "Sophomore") newClassYear = "Junior";
                else if (player.classYear === "Freshman") newClassYear = "Sophomore";
              
                // Update the ID (for college players)
                const idParts = player.id.split('-');
                idParts[2] = newClassYear;
                const newId = idParts.join('-');
              
                // Increase attributes randomly
                const updatedAttributes = Object.fromEntries(
                  Object.entries(player.attributes).map(([key, value]) => {
                    return [key, Math.min(value + getRandomIncrease(), 100)];
                  })
                ) as Player['attributes'];

                const newTotalAttributes = calculateTotalAttributes(updatedAttributes);
              
                // Increase height only for rising freshmen and sophomores
                let newHeight = player.height;
                if (player.classYear === "Freshman" || newClassYear === "Sophomore") {
                    newHeight = Math.min(player.height + getRandomHeightIncrease(), 91);
                }
              
                return {
                    ...player,
                    id: newId,
                    classYear: newClassYear,
                    attributes: updatedAttributes,
                    height: newHeight,
                    totalAttributes: newTotalAttributes,
                  };
              });
    
            // Add senior commits as freshmen
            let freshmanCounter = 1;
    
            const newFreshmen = teamSeniorCommits[teamDoc.id].map(playerId => {
                const player = recruitsSnap.docs
                  .flatMap(doc => doc.data().players)
                  .find(p => p.id === playerId) as Player | undefined;
                if (player) {
                  // Check if it's a high school player
                  if (player.id.startsWith('hs-')) {
                    // Create new college player ID
                    const newId = `player-${teamDoc.id}-Freshman-${freshmanCounter}`;
                    freshmanCounter++;
              
                    // Increase attributes randomly
                    const updatedAttributes = Object.fromEntries(
                      Object.entries(player.attributes).map(([key, value]) => {
                        return [key, Math.min(value + getRandomIncrease(), 100)];
                      })
                    ) as Player['attributes'];
              
                    // Increase height for new freshmen
                    const newHeight = Math.min(player.height + getRandomHeightIncrease(), 91);
              
                    return {
                      ...player,
                      id: newId,
                      classYear: "Freshman",
                      attributes: updatedAttributes,
                      height: newHeight,
                    };
                  } else {
                    // It's already a college player, just update the class year
                    const idParts = player.id.split('-');
                    idParts[2] = "Freshman";
                    const newId = idParts.join('-');
                    return {
                      ...player,
                      id: newId,
                      classYear: "Freshman"
                    };
                  }
                }
                return null;
              }).filter((player): player is Player => player !== null);
          
            updatedPlayers = [...updatedPlayers, ...newFreshmen];

            // Sort players by total attributes
            updatedPlayers = sortPlayersByTotalAttributes(updatedPlayers);

            // Set positions for players
            updatedPlayers = setPositions(updatedPlayers);
    
            // Update myRecruits
            let updatedMyRecruits = teamData.myRecruits || [];
updatedMyRecruits = (updatedMyRecruits as Recruit[])
  .filter((recruit: Recruit) => {
    const player = recruitsSnap.docs
      .flatMap(doc => doc.data().players)
      .find(p => p.id === recruit.playerId);
    return player && player.classYear !== "Senior";
  })
  .map((recruit: Recruit) => {
    const newId = idChangeMap[recruit.playerId] || recruit.playerId;
    return { ...recruit, playerId: newId };
  });
            // Update the team document
            batch.update(teamDoc.ref, { 
              players: updatedPlayers,
              seniorCommits: [],
              juniorCommits: teamData.juniorCommits || [],
              myRecruits: updatedMyRecruits
            });
          }
      
          // Commit all updates
          await batch.commit();
      
          alert('Rollover completed successfully!');
          onRolloverComplete();
        } catch (error) {
          console.error("Error during rollover: ", error);
          alert('An error occurred during rollover.');
        }
    };

    return (
        <button
        onClick={handleRollover}
        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
        >
        Perform Rollover
        </button>
    );
};

export default RolloverButton;