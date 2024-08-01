import React from 'react';
import { db, auth } from './firebaseConfig'; // Adjust the path if needed
import { collection, doc, writeBatch, } from "firebase/firestore";
import { randomNormal } from 'd3-random';

interface GenerateTeamsButtonProps {
  onTeamsGenerated: (teams: any) => void;
  setLoading: (loading: boolean) => void;
}
interface TeamData {
  players: Player[];
  recruitingPoints: number;
  pendingRecruitingActions: [string, number, boolean][]; // Array of tuples: [playerId, points, offeredScholarship]
  myRecruits: [string, number, boolean][];
  juniorCommits: Set<string>; // New field
  seniorCommits: Set<string>; // New field
}

interface RecruitingInfo {
  teamName: string;
  pointsSpent: number;
  offeredScholarship: boolean;
}

interface HighSchoolPlayer extends Player {
  recruitingInfo: RecruitingInfo[];
  committed: boolean;
  teamCommittedTo: string;
  recruitDate: {
    year: "Junior" | "Senior";
    day: number;
  };
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
  }

const firstNames = ["Michael", "LeBron", "Kobe", "Stephen", "Kevin", "Shaquille", "Tim", "Magic", "Larry", "Kareem"];
const lastNames = ["Jordan", "James", "Bryant", "Curry", "Durant", "O'Neal", "Duncan", "Johnson", "Bird", "Abdul-Jabbar"];
const classYears = ["Freshman", "Sophomore", "Junior", "Senior"];

const generateRandomName = () => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
};

const generateRandomAttributes = (isHighSchool: boolean) => {
    
    const attributes = {
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
  
    const progressionAttributes = Object.fromEntries(
        Object.keys(attributes).map(key => [`${key}Progression`, Math.max(0, Math.random() * 8)])
    );

    // Add height progression
    const heightProgression = isHighSchool ? Math.max(0, Math.random() * 6) : 0;
    progressionAttributes['heightProgression'] = heightProgression;
  
    return { ...attributes, ...progressionAttributes };
};
  
const generateRandomHeight = () => {
  const minInches = 68; // 5 feet 8 inches
  const maxInches = 87; // 7 feet 3 inches
  const height = Math.floor(Math.random() * (maxInches - minInches + 1)) + minInches;
  return height;
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

  const generateTeams = () => {
    const teamNames = Array.from({ length: 64 }, (_, i) => (i + 1).toString());
    const newTeams: { [key: string]: TeamData } = {};
  
    teamNames.forEach(teamName => {
      const players: Player[] = [];
  
      classYears.forEach(classYear => {
        for (let i = 0; i < 3; i++) {
          const baseAttributes = generateRandomAttributes(false); // false for college players
          let bonus = 0;
          if (classYear === "Sophomore") bonus = 4;
          if (classYear === "Junior") bonus = 8;
          if (classYear === "Senior") bonus = 12;
  
          const enhancedAttributes = Object.fromEntries(
            Object.entries(baseAttributes).map(([key, value]) => {
              // Apply bonus only to normal attributes (not ending with 'Progression')
              if (!key.endsWith('Progression')) {
                return [key, Math.min(value + 16 + bonus, 100)];
              }
              // Return progression attributes unchanged
              return [key, value];
            })
          );
          players.push({
            id: `player-${teamName}-${classYear}-${i}`,
            name: generateRandomName(),
            classYear: classYear,
            height: generateRandomHeight(),
            position: '',
            attributes: enhancedAttributes,
            stats: generateInitialStats(), // Add this line
          });
        }
      });
  
      players.forEach(player => {
        player.totalAttributes = Object.values(player.attributes).reduce((sum, value) => sum + value, 0);
      });
  
      players.sort((a, b) => b.totalAttributes! - a.totalAttributes!);
  
      const starters = players.slice(0, 5);
      const backups = players.slice(5, 10);
      const extras = players.slice(10);
  
      starters.sort((a, b) => a.height - b.height);
      backups.sort((a, b) => a.height - b.height);
  
      const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
      starters.forEach((player, index) => {
        player.position = positionOrder[index];
      });
  
      const backupPositionOrder = ['bPG', 'bSG', 'bSF', 'bPF', 'bC'];
      backups.forEach((player, index) => {
        player.position = backupPositionOrder[index];
      });
  
      extras.forEach(player => {
        player.position = 'N/A';
      });
  
      newTeams[teamName] = {
        players: [...starters, ...backups, ...extras],
        recruitingPoints: 150,
        pendingRecruitingActions: [],
        myRecruits: [],
        juniorCommits: new Set<string>(), // Initialize as an empty set
        seniorCommits: new Set<string>(), // Initialize as an empty set
      };
    });
    return newTeams;
  };  

const generateRandomHeighths = (classYear: string) => {
    const normalDistribution = randomNormal(68, 3);
    let height = normalDistribution();
  
    // Add inches based on class year
    if (classYear === "Sophomore") height += 3;
    else if (classYear === "Junior") height += 6;
    else if (classYear === "Senior") height += 9;
  
    // Ensure the height is within a reasonable range
    height = Math.max(60, Math.min(91, height)); // Between 5'0" and 7'0"
  
    return Math.round(height);
  };
  
  const generateHighSchoolTeams = () => {
    const teamNames = Array.from({ length: 64 }, (_, i) => (i + 1).toString());
    const newTeams: { [key: string]: HighSchoolPlayer[] } = {};
  
    teamNames.forEach(teamName => {
      const players: HighSchoolPlayer[] = [];
  
      classYears.forEach(classYear => {
        for (let i = 0; i < 3; i++) {
          const baseAttributes = generateRandomAttributes(true);
          let bonus = 0;
          if (classYear === "Sophomore") bonus = 4;
          if (classYear === "Junior") bonus = 8;
          if (classYear === "Senior") bonus = 12;
  
          const enhancedAttributes = Object.fromEntries(
            Object.entries(baseAttributes).map(([key, value]) => {
              if (!key.endsWith('Progression')) {
                return [key, Math.min(value + bonus, 100)];
              }
              return [key, value];
            })
          );
  
          // Generate recruit date
          const recruitDate = {
            year: Math.random() < 0.5 ? "Junior" : "Senior",
            day: (Math.floor(Math.random() * 10) + 1) * 3 + 1
          };
  
          // Ensure seniors commit in their senior year
          if (classYear === "Senior") {
            recruitDate.year = "Senior";
          }
  
          players.push({
            id: `hs-player-${teamName}-${classYear}-${i}`,
            name: generateRandomName(),
            classYear: classYear,
            height: generateRandomHeighths(classYear),
            position: '',
            attributes: enhancedAttributes,
            stats: generateInitialStats(),
            recruitingInfo: [],
            committed: false,
            teamCommittedTo: '',
            recruitDate: recruitDate,
          } as HighSchoolPlayer);
        }
      });
  
    players.forEach(player => {
      player.totalAttributes = Object.values(player.attributes).reduce((sum, value) => sum + value, 0);
    });

    players.sort((a, b) => b.totalAttributes! - a.totalAttributes!);

    const starters = players.slice(0, 5);
    const backups = players.slice(5, 10);
    const extras = players.slice(10);

    starters.sort((a, b) => a.height - b.height);
    backups.sort((a, b) => a.height - b.height);

    const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
    starters.forEach((player, index) => {
      player.position = positionOrder[index];
    });

    const backupPositionOrder = ['bPG', 'bSG', 'bSF', 'bPF', 'bC'];
    backups.forEach((player, index) => {
      player.position = backupPositionOrder[index];
    });

    extras.forEach(player => {
      player.position = 'N/A';
    });

    newTeams[teamName] = [...starters, ...backups, ...extras];
  });

  return newTeams;
};
  
  const GenerateTeamsButton: React.FC<GenerateTeamsButtonProps> = ({ onTeamsGenerated, setLoading }) => {
    const uploadTeamData = async () => {
      const user = auth.currentUser;
      if (!user) {
        alert('Please log in to generate teams.');
        return;
      }
  
      try {
        setLoading(true);
  
        // Generate data in smaller chunks
        const teams = generateTeams();
        const highSchoolTeams = generateHighSchoolTeams();
        const teamNames = Object.keys(teams);
        
        // Upload teams and recruits
        await uploadTeamsAndRecruits(user.uid, teams, highSchoolTeams);
  
        // Generate and upload schedule
        await generateAndUploadSchedule(user.uid, teamNames);
  
        onTeamsGenerated(teams);
        alert('Teams, recruits, and schedule generated and saved successfully!');
      } catch (error) {
        console.error("Error uploading data: ", error);
        alert('An error occurred while saving the teams, recruits, and schedule.');
      } finally {
        setLoading(false);
      }
    };
  
    const uploadTeamsAndRecruits = async (userId: string, teams: { [key: string]: TeamData }, highSchoolTeams: { [key: string]: Player[] }) => {
      const teamsCollectionRef = collection(db, "users", userId, "teams");
      const recruitsCollectionRef = collection(db, "users", userId, "recruits");
    
      const batch = writeBatch(db);
    
      for (const [teamName, teamData] of Object.entries(teams)) {
        // Convert Sets to Arrays
        const teamDataToSave = {
          ...teamData,
          juniorCommits: Array.from(teamData.juniorCommits),
          seniorCommits: Array.from(teamData.seniorCommits)
        };
        batch.set(doc(teamsCollectionRef, teamName), teamDataToSave);
      }
    
      for (const [teamName, players] of Object.entries(highSchoolTeams)) {
        batch.set(doc(recruitsCollectionRef, teamName), { players });
      }
    
      await batch.commit();
    };
  
    const generateAndUploadSchedule = async (userId: string, teamNames: string[]) => {
      const scheduleCollectionRef = collection(db, "users", userId, "schedule");
      const totalDays = 21;
      const matchupsPerDay = teamNames.length / 2;
  
      for (let day = 1; day <= totalDays; day++) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 0)); // Allow UI to update
  
        const daySchedule = generateDaySchedule(teamNames, day, matchupsPerDay);
        
        const batch = writeBatch(db);
        batch.set(doc(scheduleCollectionRef, day.toString()), daySchedule);
        await batch.commit();
      }
    };
  
    const generateDaySchedule = (teamNames: string[], day: number, matchupsPerDay: number) => {
      const daySchedule: { [matchup: string]: [string, string] } = {};
      const dayMatches: Set<string> = new Set();
  
      for (let match = 1; match <= matchupsPerDay; match++) {
        let team1: string, team2: string;
        let attempts = 0;
        const maxAttempts = 1000;
  
        do {
          team1 = teamNames[Math.floor(Math.random() * teamNames.length)];
          team2 = teamNames[Math.floor(Math.random() * teamNames.length)];
          attempts++;
  
          if (attempts > maxAttempts) {
            console.warn(`Could not find a valid matchup for day ${day}, match ${match}`);
            break;
          }
        } while (
          team1 === team2 ||
          dayMatches.has(team1) ||
          dayMatches.has(team2)
        );
  
        if (attempts <= maxAttempts) {
          dayMatches.add(team1);
          dayMatches.add(team2);
          daySchedule[`Match${match}`] = [team1, team2];
        }
      }
  
      return daySchedule;
    };
  
    return (
      <button
        onClick={uploadTeamData}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Generate and Upload Teams and Schedule
      </button>
    );
  };
  
  export default GenerateTeamsButton;
  