import seedrandom from 'seedrandom';

export interface Player {
  id: number;
  name: string;
  year: string;
  shooting: number;
  layups: number;
  dunking: number;
  ballHandling: number;
  passing: number;
  rebounding: number;
  interiorDefense: number;
  perimeterDefense: number;
  stealing: number;
  blocking: number;
  strength: number;
  speed: number;
}

const firstNames: string[] = ['John', 'Liam', 'Noah', 'Ethan', 'Mason', 'William', 'James', 'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Michael', 'Daniel', 'Matthew', 'Jackson', 'Sebastian', 'Jack', 'Aiden', 'Owen', 'Samuel'];
const lastNames: string[] = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const getRandomItem = (array: any[], rng: () => number) => {
    return array[Math.floor(rng() * array.length)];
  };
const generateSeededRandom = (seed: string) => {
  const rng = seedrandom(seed);
  return () => Number((rng() * 6).toFixed(2));
};

const generateRandomPlayer = (id: number, year: string, seed: string): Player => {
    const rng = seedrandom(`${seed}-${id}-${year}`);
    
    const getRandomNumber = () => Number((rng() * 6).toFixed(2));
    
    const firstName = getRandomItem(firstNames, rng);
    const lastName = getRandomItem(lastNames, rng);
  
    return {
      id,
      name: `${firstName} ${lastName}`,
      year,
      shooting: getRandomNumber(),
      layups: getRandomNumber(),
      dunking: getRandomNumber(),
      ballHandling: getRandomNumber(),
      passing: getRandomNumber(),
      rebounding: getRandomNumber(),
      interiorDefense: getRandomNumber(),
      perimeterDefense: getRandomNumber(),
      stealing: getRandomNumber(),
      blocking: getRandomNumber(),
      strength: getRandomNumber(),
      speed: getRandomNumber(),
    };
  };
  

const generateTeam = (teamName: string): Player[] => {
  return [
    ...Array(3).fill(null).map((_, i) => generateRandomPlayer(i + 1, 'Freshman', `${teamName}-freshman`)),
    ...Array(3).fill(null).map((_, i) => generateRandomPlayer(i + 4, 'Sophomore', `${teamName}-sophomore`)),
    ...Array(3).fill(null).map((_, i) => generateRandomPlayer(i + 7, 'Junior', `${teamName}-junior`)),
    ...Array(3).fill(null).map((_, i) => generateRandomPlayer(i + 10, 'Senior', `${teamName}-senior`)),
  ];
};

export const currentPlayers: Record<string, Player[]> = {
  a: generateTeam('a'),
  b: generateTeam('b'),
  c: generateTeam('c'),
  d: generateTeam('d'),
  e: generateTeam('e'),
  f: generateTeam('f'),
  g: generateTeam('g'),
  h: generateTeam('h'),
  i: generateTeam('i'),
  j: generateTeam('j'),
};
