'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../../../firebaseConfig'; // Adjust the path as needed
import { doc, getDoc } from 'firebase/firestore';

interface GameEvent {
  time: string;
  player: string;
  action: string;
  defender?: string;
  team: 'home' | 'away';
  pointsScored: number;
}

interface PlayByPlayPageProps {
  params: {
    day: string;
    matchID: string;
  }
}

const PlayByPlayPage: React.FC<PlayByPlayPageProps> = ({ params }) => {
  const { day, matchID } = params;
  const [playByPlay, setPlayByPlay] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayByPlay = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const gameDocRef = doc(db, 'users', auth.currentUser.uid, 'gameResults', day, 'games', matchID);
        const gameDoc = await getDoc(gameDocRef);

        if (gameDoc.exists()) {
          const data = gameDoc.data();
          if (data && data.playByPlay) {
            setPlayByPlay(data.playByPlay);
          } else {
            setError('Play-by-play data not found in the game document.');
          }
        } else {
          setError('No game data found for this match.');
        }
      } catch (error) {
        console.error('Error fetching play-by-play data:', error);
        setError('Failed to fetch play-by-play data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayByPlay();
  }, [day, matchID]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  let homeScore = 0;
  let awayScore = 0;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Play-by-Play</h1>
      {playByPlay.length > 0 ? (
        <div>
          <div className="flex justify-between mb-4">
            <span className="font-bold">Home Team</span>
            <span className="font-bold">Away Team</span>
          </div>
          {playByPlay.map((event, index) => {
            if (event.team === 'home') {
              homeScore += event.pointsScored;
            } else {
              awayScore += event.pointsScored;
            }
            
            return (
              <div key={index} className="flex justify-between mb-2 items-center">
                {event.team === 'home' ? (
                  <>
                    <div className="w-5/12 text-right pr-2">
                      <span>{event.time} - </span>
                      <span>{event.player} </span>
                      <span>{event.action} </span>
                      {event.defender && <span>against {event.defender}</span>}
                    </div>
                    <div className="w-2/12 text-center font-bold">
                      {homeScore} - {awayScore}
                    </div>
                    <div className="w-5/12"></div>
                  </>
                ) : (
                  <>
                    <div className="w-5/12"></div>
                    <div className="w-2/12 text-center font-bold">
                      {homeScore} - {awayScore}
                    </div>
                    <div className="w-5/12 text-left pl-2">
                      <span>{event.time} - </span>
                      <span>{event.player} </span>
                      <span>{event.action} </span>
                      {event.defender && <span>against {event.defender}</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>No play-by-play data available for this match.</div>
      )}
    </div>
  );
};

export default PlayByPlayPage;