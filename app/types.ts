// types.ts

export interface Player {
    id: string;
    name: string;
    classYear: string;
    height: number;
    position: string;
    attributes: {
        threePoint: number,
        midRange: number,
        closeRange: number,
        freeThrow: number,
        passSteal: number,
        dribbleSteal: number,
        block: number,
        passing: number,
        dribbling: number,
        offensiveRebounding: number,
        defensiveRebounding: number,
        defensiveFoul: number,
        shotIQ: number,
        passingIQ: number,
        createSpace: number,
        defensiveQuickness: number,
        stamina: number
      };
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
    totalAttributes?: number;
  }
  
  export interface Game {
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    boxScore?: BoxScore;
    playByPlay?: PlayByPlay;
  }
  
  export interface Schedule {
    [day: number]: Game[];
  }
  
  export interface BoxScorePlayer {
    name: string;
    minutes: number;
    points: number;
    offensiveRebounds: number;
    defensiveRebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fgm: number;
    fga: number;
    tpm: number;
    tpa: number;
    ftm: number;
    fta: number;
  }
  
  export interface BoxScore {
    homeTeam: {
      name: string;
      score: number;
      players: BoxScorePlayer[];
    };
    awayTeam: {
      name: string;
      score: number;
      players: BoxScorePlayer[];
    };
  }
  
  export interface SimulateNextDayButtonProps {
    userId: string;
    onSimulationComplete: () => void;
  }
  
  export interface GenerateTeamsButtonProps {
    onTeamsGenerated: (teams: { [key: string]: Player[] }) => void;
    setLoading: (loading: boolean) => void;
  }
  
  export interface Team {
    [key: string]: Player[];
  }
  
  // New types for play-by-play functionality
  
  export interface PlayByPlayEvent {
    time: string;
    player: string;
    action: string;
    defender: string;
  }
  
  export type GameEvent = {
    player: string;
    action: string;
    defender: string;
    team: 'home' | 'away';
    pointsScored: number;
    homePlayersOnCourt: string[];
    awayPlayersOnCourt: string[];
    contestedPercentages: { [key: string]: number };
    receiver?: string; // New field for pass events
    stealingPlayer?: Player;
};

  // Update the PlayByPlayEvent interface
export interface PlayByPlayEvent extends GameEvent {
    time: string;
}

// Update the PlayByPlay type
export type PlayByPlay = PlayByPlayEvent[];
  
  export interface SimulationResult {
    boxScore: BoxScore;
    playByPlay: PlayByPlay;
    updatedHomePlayers: Player[];
    updatedAwayPlayers: Player[];
  }