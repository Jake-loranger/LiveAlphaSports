import React, { useEffect, useState } from 'react';
import { LiveScoresService } from '../services/liveScoresService';
import './LiveScores.css';

interface LiveGame {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  period: number;
  timeRemaining: string;
  sport: string;
  inningState?: string; // For baseball games: "Top" or "Bottom"
}

export const LiveScores: React.FC = () => {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const liveScoresService = LiveScoresService.getInstance();
        const liveGames = await liveScoresService.getLiveGames();
        setGames(liveGames);
        setError(null);
      } catch (err) {
        setError('Failed to fetch live scores');
        console.error(err);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for updates
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  const liveGames = games.filter(game => game.status === 'STATUS_IN_PROGRESS');
  const upcomingGames = games.filter(game => 
    game.status !== 'STATUS_IN_PROGRESS' && 
    game.status !== 'STATUS_FINAL' && 
    game.status !== 'STATUS_POSTPONED'
  );

  const renderGameCard = (game: LiveGame, isLive: boolean) => (
    <div key={`${game.homeTeam}-${game.awayTeam}`} className="score-card">
      <div className="game-header">
        <span className="sport">{game.sport}</span>
        {game.status === 'STATUS_DELAYED' && (
          <span className="delayed-badge">Delayed</span>
        )}
      </div>
      <div className="teams">
        <div className="team home">
          <span className="team-name">{game.homeTeam}</span>
          <span className="score">{game.homeScore}</span>
        </div>
        <div className="team away">
          <span className="team-name">{game.awayTeam}</span>
          <span className="score">{game.awayScore}</span>
        </div>
      </div>
      {isLive && (
        <div className="game-info">
          <span className="period">
            {game.sport === 'MLB' ? (
              <>
                {`Inning ${game.period}`}
                {game.inningState && (
                  <span className="inning-arrow">
                    {game.inningState === 'Top' ? '↑' : '↓'}
                  </span>
                )}
              </>
            ) : game.sport === 'NBA' ? `Q${game.period}` :
               game.sport === 'NFL' ? `Q${game.period}` :
               `Period ${game.period}`}
          </span>
          {(game.sport === 'NBA' || game.sport === 'NFL' || game.sport === 'NHL') && (
            <span className="time">{game.timeRemaining}</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="live-scores">
      <h2>Sports Scores</h2>
      
      {liveGames.length > 0 && (
        <div className="section">
          <h3>Live Games</h3>
          <div className="scores-grid">
            {liveGames.map(game => renderGameCard(game, true))}
          </div>
        </div>
      )}

      {upcomingGames.length > 0 && (
        <div className="section">
          <h3>Upcoming Games</h3>
          <div className="scores-grid">
            {upcomingGames.map(game => renderGameCard(game, false))}
          </div>
        </div>
      )}

      {liveGames.length === 0 && upcomingGames.length === 0 && (
        <div className="no-games">No games scheduled at the moment</div>
      )}
    </div>
  );
}; 