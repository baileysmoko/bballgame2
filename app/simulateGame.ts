import { Player, BoxScore, BoxScorePlayer, PlayByPlay, GameEvent } from './types';
import { randomNormal } from 'd3-random';

const GAME_LENGTH = 40 * 60; // 40 minutes in seconds

function simulateNextGame(homeTeam: Player[], awayTeam: Player[]): { boxScore: BoxScore, playByPlay: PlayByPlay,     updatedHomePlayers: Player[],updatedAwayPlayers: Player[] } {
    const playByPlay: PlayByPlay = [];
    const homeBoxScore: BoxScorePlayer[] = homeTeam.slice(0, 5).map(initializeBoxScorePlayer);
    const awayBoxScore: BoxScorePlayer[] = awayTeam.slice(0, 5).map(initializeBoxScorePlayer);
  
    let gameTime = 0;
    let possession: 'home' | 'away' = Math.random() < 0.5 ? 'home' : 'away';
  
    const homeStarters = homeTeam.slice(0, 5);
    const awayStarters = awayTeam.slice(0, 5);
  
    while (gameTime < GAME_LENGTH) {
        const offensiveTeam = possession === 'home' ? homeStarters : awayStarters;
        const defensiveTeam = possession === 'home' ? awayStarters : homeStarters;
        const offensiveBoxScore = possession === 'home' ? homeBoxScore : awayBoxScore;
        const defensiveBoxScore = possession === 'home' ? awayBoxScore : homeBoxScore;

        const contestedPercentages = calculateContestedPercentages(offensiveTeam, defensiveTeam);

        // Check if we need to inbound the ball (after a made shot)
        if (playByPlay.length > 0 && playByPlay[playByPlay.length - 1].action.includes('makes')) {
            // The team that just got scored on gets the ball
            const scoredOnTeam = possession;
            possession = scoredOnTeam; // Keep possession with the team that was scored on
        
            const inboundingTeam = scoredOnTeam === 'home' ? homeStarters : awayStarters;
            const defendingTeam = scoredOnTeam === 'home' ? awayStarters : homeStarters;
        
            const inboundEvent = inboundToPG(
                inboundingTeam,  // team that will inbound (just got scored on)
                defendingTeam,   // team that just scored
                scoredOnTeam,    // possession stays with the team that was scored on
                contestedPercentages
            );
            playByPlay.push({
                time: formatGameTime(gameTime),
                ...inboundEvent
            });
            gameTime += 2; // Add 2 seconds for inbounding
        }
        const events = simulatePossession(offensiveTeam, defensiveTeam, offensiveBoxScore, defensiveBoxScore, possession, contestedPercentages);

        for (const event of events) {
            playByPlay.push({
                time: formatGameTime(gameTime),
                ...event
            });
            gameTime += event.action === 'passes' ? 3 : 2;
        }

        possession = possession === 'home' ? 'away' : 'home';
    }

    const boxScore: BoxScore = {
      homeTeam: {
        name: "Home Team",
        score: calculateTeamScore(homeBoxScore),
        players: homeBoxScore
      },
      awayTeam: {
        name: "Away Team",
        score: calculateTeamScore(awayBoxScore),
        players: awayBoxScore
      }
    };

    const updatedHomePlayers = updatePlayerStats(homeTeam, homeBoxScore);
    const updatedAwayPlayers = updatePlayerStats(awayTeam, awayBoxScore);

    return { boxScore, playByPlay, updatedHomePlayers, updatedAwayPlayers };;
}
function updatePlayerStats(team: Player[], boxScore: BoxScorePlayer[]): Player[] {
    return team.map(player => {
        const playerBoxScore = boxScore.find(bs => bs.name === player.name);
        
        // Create a new player object
        const updatedPlayer = { ...player };
        
        if (playerBoxScore) {
            // Player played in the game, update their stats
            updatedPlayer.stats = {
                gamesPlayed: player.stats.gamesPlayed + 1,
                points: player.stats.points + playerBoxScore.points,
                rebounds: player.stats.rebounds + (playerBoxScore.offensiveRebounds + playerBoxScore.defensiveRebounds),
                assists: player.stats.assists + playerBoxScore.assists,
                steals: player.stats.steals + playerBoxScore.steals,
                blocks: player.stats.blocks + playerBoxScore.blocks,
                fgm: player.stats.fgm + playerBoxScore.fgm,
                fga: player.stats.fga + playerBoxScore.fga,
                tpm: player.stats.tpm + playerBoxScore.tpm,
                tpa: player.stats.tpa + playerBoxScore.tpa,
                ftm: player.stats.ftm + playerBoxScore.ftm,
                fta: player.stats.fta + playerBoxScore.fta
            };
        } else {
            // Player didn't play, just increment gamesPlayed
            updatedPlayer.stats = {
                ...player.stats,
                gamesPlayed: player.stats.gamesPlayed + 1
            };
        }

        return updatedPlayer;
    });
}

function inboundToPG(
    inboundingTeam: Player[],
    defendingTeam: Player[],
    possession: 'home' | 'away',
    contestedPercentages: { [key: string]: number }
): GameEvent {
    const smallForward = inboundingTeam.find(player => player.position.toLowerCase() === 'sf') || inboundingTeam[2];
    const pointGuard = inboundingTeam.find(player => player.position.toLowerCase() === 'pg') || inboundingTeam[0];

    return {
        player: smallForward.name,
        action: 'inbounds',
        receiver: pointGuard.name,
        defender: '',
        team: possession,
        pointsScored: 0,
        homePlayersOnCourt: possession === 'home' ? inboundingTeam.map(p => p.name) : defendingTeam.map(p => p.name),
        awayPlayersOnCourt: possession === 'away' ? inboundingTeam.map(p => p.name) : defendingTeam.map(p => p.name),
        contestedPercentages: contestedPercentages
    };
}

function calculateContestedPercentages(offensiveTeam: Player[], defensiveTeam: Player[]): { [key: string]: number } {
    const contestedPercentages: { [key: string]: number } = {};
    
    offensiveTeam.forEach((offensivePlayer, index) => {
        const defensivePlayer = defensiveTeam[index];
        const meanContestedPercentage = defensivePlayer.attributes.defensiveQuickness / 
            (offensivePlayer.attributes.createSpace + defensivePlayer.attributes.defensiveQuickness);
        
        const normalDist = randomNormal(meanContestedPercentage, 0.2);
        contestedPercentages[offensivePlayer.name] = Math.max(0, Math.min(1, normalDist()));
    });

    return contestedPercentages;
}

function initializeBoxScorePlayer(player: Player): BoxScorePlayer {
    return {
      name: player.name,
      minutes: 0,
      points: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0
    };
  }
  
  function selectDefender(team: Player[], shooter: Player): Player {
    // Select the defender with the same position as the shooter
    const matchingDefender = team.find(player => player.position === shooter.position);
    if (matchingDefender) {
      return matchingDefender;
    }
    // If no matching position is found, select based on defensive attributes
    const weights = team.map(player => 
        player.attributes.block + player.attributes.defensiveQuickness
    );
    return weightedRandomSelection(team, weights);
  }
  
  type CourtPosition = 'closeRange' | 'midRange' | 'threePointRange';

function determineCourtPosition(player: Player): CourtPosition {
  const random = Math.random();
  switch (player.position.toLowerCase()) {
    case 'c':
      if (random < 0.8) return 'closeRange';
      if (random < 0.9) return 'midRange';
      return 'threePointRange';
    case 'pf':
      if (random < 0.6) return 'closeRange';
      if (random < 0.8) return 'midRange';
      return 'threePointRange';
    case 'sf':
      if (random < 0.4) return 'closeRange';
      if (random < 0.7) return 'midRange';
      return 'threePointRange';
    case 'sg':
      if (random < 0.2) return 'closeRange';
      if (random < 0.6) return 'midRange';
      return 'threePointRange';
    case 'pg':
      if (random < 0.1) return 'closeRange';
      if (random < 0.55) return 'midRange';
      return 'threePointRange';
    default:
      // Default to equal probabilities if position is unknown
      if (random < 0.33) return 'closeRange';
      if (random < 0.66) return 'midRange';
      return 'threePointRange';
  }
}

function decideShotType(shooter: Player, courtPosition: CourtPosition): 'layup' | 'midRange' | 'threePointer' {
  switch (courtPosition) {
    case 'closeRange':
      return 'layup';
    case 'midRange':
      return 'midRange';
    case 'threePointRange':
      return 'threePointer';
  }
}
function simulatePossession(
    offensiveTeam: Player[],
    defensiveTeam: Player[],
    offensiveBoxScore: BoxScorePlayer[],
    defensiveBoxScore: BoxScorePlayer[],
    possession: 'home' | 'away',
    contestedPercentages: { [key: string]: number },
    startingPlayer?: Player  // Add this parameter
  ): GameEvent[] {
    let events: GameEvent[] = [];
    let pointGuard = offensiveTeam.find(player => player.position.toLowerCase() === 'pg') || offensiveTeam[0];
    let currentPlayer = startingPlayer || pointGuard;  // Use startingPlayer if provided
    let timeElapsed = 0;
    let shotClock = 30;
    let initialSequenceComplete = false;

    // Start with 3-5 dribbles or 0-2 dribbles followed by a pass
    const initialDribbles = Math.floor(Math.random() * 6); // 0-5 dribbles
    for (let i = 0; i < initialDribbles; i++) {
        const defender = selectDefender(defensiveTeam, currentPlayer);  // Use currentPlayer instead of pointGuard
        const stealProbability = (defender.attributes.dribbleSteal / 5000) / (1 + currentPlayer.attributes.dribbling / 100);
        
        if (Math.random() < stealProbability) {
            // Steal successful
            const defenderStats = defensiveBoxScore.find(p => p.name === defender.name)!;
            defenderStats.steals++;
            events.push({
                player: defender.name,
                action: 'steals from',
                defender: currentPlayer.name,  // Use currentPlayer instead of pointGuard
                team: possession === 'home' ? 'away' : 'home',
                pointsScored: 0,
                homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                contestedPercentages: contestedPercentages,
                stealingPlayer: defender  // Add this line to pass the stealing player
            });
            // End the possession early if a steal occurs
            return events;
        } else {
            // Dribble successful
            events.push({
                player: currentPlayer.name,  // Use currentPlayer instead of pointGuard
                action: 'dribbles',
                defender: defender.name,
                team: possession,
                pointsScored: 0,
                homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                contestedPercentages: contestedPercentages
            });
        }
        timeElapsed += 2;
    }

    // If initial dribbles are less than 3, follow with a pass
    if (initialDribbles < 3) {
        const receiver = selectReceiver(offensiveTeam, pointGuard);
        events.push({
            player: pointGuard.name,
            action: 'passes',
            receiver: receiver.name,
            defender: '',
            team: possession,
            pointsScored: 0,
            homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
            awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
            contestedPercentages: contestedPercentages
        });
        currentPlayer = receiver;
        timeElapsed += 3;
    }

    initialSequenceComplete = true;

    while (shotClock > 0) {
        const event = simulatePlayerAction(currentPlayer, offensiveTeam, defensiveTeam, offensiveBoxScore, defensiveBoxScore, possession, contestedPercentages, initialSequenceComplete);
        events.push(event);

        if (event.action.includes('makes')) {
            // Shot made, end possession
            break;
        } else if (event.action.includes('misses')) {
            // Shot missed, simulate rebound
            const reboundEvent = simulateRebound(offensiveTeam, defensiveTeam, offensiveBoxScore, defensiveBoxScore, possession);
            events.push(reboundEvent);
            
            if (reboundEvent.team === possession) {
                // Offensive rebound, reset shot clock to 20
                shotClock = 20;
                currentPlayer = offensiveTeam.find(p => p.name === reboundEvent.player)!;
            } else {
                // Defensive rebound, end possession
                break;
            }
        } else if (event.action === 'steals from') {
            // Possession changes due to steal
            break;

        } else if (event.action === 'passes') {
            // Find the receiver and update currentPlayer
            const receiver = offensiveTeam.find(player => player.name === event.receiver);
            if (receiver) {
                currentPlayer = receiver;
                timeElapsed += 3; // Add 3 seconds for a pass
            }
        } else if (event.action === 'dribbles') {
            // Player keeps possession after dribbling
            timeElapsed += 2; // Add 2 seconds for a dribble
        } else {
            // Other actions (shouldn't normally occur, but just in case)
            timeElapsed += 2;
        }

        // Check if shot clock has expired
        shotClock -= (event.action === 'passes' ? 3 : 2);

        // Check if shot clock has expired
        if (shotClock <= 0) {
            events.push({
                player: currentPlayer.name,
                action: 'shot clock violation',
                defender: '',
                team: possession,
                pointsScored: 0,
                homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                contestedPercentages: contestedPercentages
            });
            break;
        }
    }

    return events;
}
function simulateRebound(
    offensiveTeam: Player[],
    defensiveTeam: Player[],
    offensiveBoxScore: BoxScorePlayer[],
    defensiveBoxScore: BoxScorePlayer[],
    possession: 'home' | 'away'
): GameEvent {
    const positionMultiplier = {
        'pg': 1,
        'sg': 2,
        'sf': 3,
        'pf': 4,
        'c': 5
    };

    const offensiveWeights = offensiveTeam.map(player => 
        player.attributes.offensiveRebounding * positionMultiplier[player.position.toLowerCase() as keyof typeof positionMultiplier]
    );

    const defensiveWeights = defensiveTeam.map(player => 
        2 * player.attributes.defensiveRebounding * positionMultiplier[player.position.toLowerCase() as keyof typeof positionMultiplier]
    );

    const allPlayers = [...offensiveTeam, ...defensiveTeam];
    const allWeights = [...offensiveWeights, ...defensiveWeights];

    const rebounder = weightedRandomSelection(allPlayers, allWeights);
    const isOffensiveRebound = offensiveTeam.includes(rebounder);

    // Update box score
    const rebounderStats = isOffensiveRebound 
    ? offensiveBoxScore.find(p => p.name === rebounder.name)!
    : defensiveBoxScore.find(p => p.name === rebounder.name)!;

    if (isOffensiveRebound) {
        rebounderStats.offensiveRebounds++;
    } else {
        rebounderStats.defensiveRebounds++;
    }

    // If defensive rebound, simulate pass to point guard
    let additionalAction = '';
    if (!isOffensiveRebound && rebounder.position.toLowerCase() !== 'pg') {
        const pointGuard = defensiveTeam.find(p => p.position.toLowerCase() === 'pg') || defensiveTeam[0];
        additionalAction = ` and passes to ${pointGuard.name}`;
    }

    return {
        player: rebounder.name,
        action: `rebounds${additionalAction}`,
        defender: '',
        team: isOffensiveRebound ? possession : (possession === 'home' ? 'away' : 'home'),
        pointsScored: 0,
        homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
        awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
        contestedPercentages: {}  // We don't need contested percentages for rebounds
    };
}

function selectReceiverDefender(defensiveTeam: Player[], receiver: Player): Player {
    return selectDefender(defensiveTeam, receiver);
}

function simulatePlayerAction(
    player: Player,
    offensiveTeam: Player[],
    defensiveTeam: Player[],
    offensiveBoxScore: BoxScorePlayer[],
    defensiveBoxScore: BoxScorePlayer[],
    possession: 'home' | 'away',
    contestedPercentages: { [key: string]: number },
    initialSequenceComplete: boolean
): GameEvent {
    if (!initialSequenceComplete) {
        // If the initial sequence is not complete, only allow dribbles or passes
        const passProbability = player.attributes.passing / (player.attributes.passing + player.attributes.dribbling);
        
        if (Math.random() < passProbability) {
            // Player attempts to pass
            const receiver = selectReceiver(offensiveTeam, player);
            const receiverDefender = selectDefender(defensiveTeam, receiver);
            const passStealProbability = (receiverDefender.attributes.passSteal / 1000) / (1 + player.attributes.passing / 100);
            
            if (Math.random() < passStealProbability) {
                // Pass steal successful
                const defenderStats = defensiveBoxScore.find(p => p.name === receiverDefender.name)!;
                defenderStats.steals++;
                return {
                    player: receiverDefender.name,
                    action: 'intercepts pass from',
                    defender: player.name,
                    team: possession === 'home' ? 'away' : 'home',
                    pointsScored: 0,
                    homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    contestedPercentages: contestedPercentages
                };
            } else {
                // Pass successful
                return {
                    player: player.name,
                    action: 'passes',
                    receiver: receiver.name,
                    defender: receiverDefender.name,
                    team: possession,
                    pointsScored: 0,
                    homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    contestedPercentages: contestedPercentages
                };
            }
        } else {
            // Player dribbles with steal attempt
            const defender = selectDefender(defensiveTeam, player);
            const stealProbability = (defender.attributes.dribbleSteal / 1000) / (1 + player.attributes.dribbling / 100);
            
            if (Math.random() < stealProbability) {
                // Steal successful
                const defenderStats = defensiveBoxScore.find(p => p.name === defender.name)!;
                defenderStats.steals++;
                return {
                    player: defender.name,
                    action: 'steals from',
                    defender: player.name,
                    team: possession === 'home' ? 'away' : 'home',
                    pointsScored: 0,
                    homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    contestedPercentages: contestedPercentages,
                    stealingPlayer: defender  // Add this line to pass the stealing player
                };
            } else {
                // Dribble successful
                return {
                    player: player.name,
                    action: 'dribbles',
                    defender: defender.name,
                    team: possession,
                    pointsScored: 0,
                    homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    contestedPercentages: contestedPercentages
                };
            }
        }
    } else {
        // Initial sequence is complete, allow shooting
        const courtPosition = determineCourtPosition(player);
        const shotType = decideShotType(player, courtPosition);
        
        // Calculate shooting probability
        const shootingAttribute = getShotAttribute(player, shotType);
        const makeProbability = (shootingAttribute / 100) / ((contestedPercentages[player.name]) + 1);
        const shootProbability = (player.attributes.shotIQ / 100) * makeProbability + (1 - player.attributes.shotIQ / 100) * 0.3;

        if (Math.random() < shootProbability) {
            // Player decides to shoot
            const defender = selectDefender(defensiveTeam, player);
            const isMade = simulateShot(player, defender, shotType, contestedPercentages[player.name]);
            updateBoxScore(offensiveBoxScore, defensiveBoxScore, player, defender, shotType, isMade);
            return createGameEvent(player, defender, shotType, isMade, possession, 
                                   offensiveTeam.map(p => p.name), defensiveTeam.map(p => p.name), contestedPercentages);
        } else {
            // Player doesn't shoot, decide between pass and dribble
            const passProbability = player.attributes.passing / (player.attributes.passing + player.attributes.dribbling);
            
            if (Math.random() < passProbability) {
                // Player passes
                const receiver = selectReceiver(offensiveTeam, player);
                return {
                    player: player.name,
                    action: 'passes',
                    receiver: receiver.name,
                    defender: '',
                    team: possession,
                    pointsScored: 0,
                    homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                    contestedPercentages: contestedPercentages
                };
            } else {
                // Player dribbles with steal attempt
                const defender = selectDefender(defensiveTeam, player);
                const stealProbability = (defender.attributes.dribbleSteal / 1000) / (1 + player.attributes.dribbling / 100);
                
                if (Math.random() < stealProbability) {
                    // Steal successful
                    const defenderStats = defensiveBoxScore.find(p => p.name === defender.name)!;
                    defenderStats.steals++;
                    return {
                        player: defender.name,
                        action: 'steals from',
                        defender: player.name,
                        team: possession === 'home' ? 'away' : 'home',
                        pointsScored: 0,
                        homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                        awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                        contestedPercentages: contestedPercentages
                    };
                } else {
                    // Dribble successful
                    return {
                        player: player.name,
                        action: 'dribbles',
                        defender: defender.name,
                        team: possession,
                        pointsScored: 0,
                        homePlayersOnCourt: possession === 'home' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                        awayPlayersOnCourt: possession === 'away' ? offensiveTeam.map(p => p.name) : defensiveTeam.map(p => p.name),
                        contestedPercentages: contestedPercentages
                    };
                }
            }
        }
    }
}
  
  function getShotAttribute(player: Player, shotType: string): number {
    switch (shotType) {
      case 'layup':
        return player.attributes.closeRange;
      case 'midRange':
        return player.attributes.midRange;
      case 'threePointer':
        return player.attributes.threePoint;
      default:
        return 50; // Default case
    }
  }
  
  function selectReceiver(team: Player[], passer: Player): Player {
    const otherPlayers = team.filter(p => p !== passer);
    const weights = otherPlayers.map(player => 
      player.attributes.shotIQ + player.attributes.closeRange + player.attributes.midRange + player.attributes.threePoint
    );
    return weightedRandomSelection(otherPlayers, weights);
  }

  function simulateShot(shooter: Player, defender: Player, shotType: string, contestedPercentage: number): boolean {
    let shootingAttribute;

    switch (shotType) {
        case 'layup':
            shootingAttribute = shooter.attributes.closeRange;
            break;
        case 'midRange':
            shootingAttribute = shooter.attributes.midRange;
            break;
        case 'threePointer':
            shootingAttribute = shooter.attributes.threePoint;
            break;
        default:
            shootingAttribute = 0; // Average case
    }

    let successProbability = (shootingAttribute / 100) / (contestedPercentage + (shootingAttribute / 100));
    
    // Adjust probability for 3-pointers
    if (shotType === 'threePointer') {
        successProbability *= 2 / 3;
    }

    return Math.random() < successProbability;
}

function updateBoxScore(
    offensiveBoxScore: BoxScorePlayer[],
    defensiveBoxScore: BoxScorePlayer[],
    shooter: Player,
    defender: Player,
    shotType: string,
    isMade: boolean
) {
    const shooterStats = offensiveBoxScore.find(p => p.name === shooter.name)!;

    shooterStats.fga++;
    if (shotType === 'threePointer') shooterStats.tpa++;

    if (isMade) {
        shooterStats.fgm++;
        if (shotType === 'threePointer') {
            shooterStats.tpm++;
            shooterStats.points += 3;
        } else {
            shooterStats.points += 2;
        }
    }

    // Simulate other stats (simplified)
    if (Math.random() < 0.1) shooterStats.assists++;
    if (Math.random() < 0.05) defensiveBoxScore.find(p => p.name === defender.name)!.blocks++;
}

function createGameEvent(
    shooter: Player,
    defender: Player,
    shotType: string,
    isMade: boolean,
    team: 'home' | 'away',
    homePlayersOnCourt: string[],
    awayPlayersOnCourt: string[],
    contestedPercentages: { [key: string]: number }
  ): GameEvent {
    const action = isMade ? "makes" : "misses";
    let pointsScored = 0;
    if (isMade) {
      pointsScored = shotType === 'threePointer' ? 3 : 2;
    }
    return {
      player: shooter.name,
      action: `${action} ${shotType}`,
      defender: defender.name,
      team: team,
      pointsScored: pointsScored,
      homePlayersOnCourt: homePlayersOnCourt,
      awayPlayersOnCourt: awayPlayersOnCourt,
      contestedPercentages: contestedPercentages
    };
  }


function formatGameTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function calculateTeamScore(boxScore: BoxScorePlayer[]): number {
  return boxScore.reduce((sum, player) => sum + player.points, 0);
}

function weightedRandomSelection<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1]; // Fallback
}

export default simulateNextGame;