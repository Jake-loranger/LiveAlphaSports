import React, { useEffect, useState } from 'react';
import { AlphaArcadeService } from '../services/alphaArcadeService';
import { SportsScoreService } from '../services/sportsScoreService';
import './LiveScores.css';

interface GameScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  period: number;
  timeRemaining: string;
  sport: string;
}

interface Market {
  id: string;
  title: string;
  categories: string[];
  endTs: number;
  label?: string;
  marketAppId: number;
  yesProb: number;
  noProb: number;
  marketVolume: number;
  secondaryTitle?: string;
}

export const LiveScores: React.FC = () => {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const alphaArcadeService = AlphaArcadeService.getInstance();
        const sportsScoreService = SportsScoreService.getInstance();

        // Fetch both markets and scores
        const [liveMarkets, liveScores] = await Promise.all([
          alphaArcadeService.getLiveMarkets(),
          sportsScoreService.getAllLiveScores()
        ]);

        // Get active sports markets
        const activeMarkets = alphaArcadeService.getActiveSportsMarkets();
        setMarkets(activeMarkets);

        // Filter scores to only include games that have active markets
        const filteredScores = liveScores.filter(score => {
          return activeMarkets.some(market => {
            const teams = alphaArcadeService.getTeamsFromMarket(market);
            if (!teams) return false;

            // Check if either team in the market matches either team in the score
            const homeTeamMatch = 
              teams.homeTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
              teams.homeTeam.toLowerCase() === score.awayTeam.toLowerCase();
            
            const awayTeamMatch = 
              teams.awayTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
              teams.awayTeam.toLowerCase() === score.awayTeam.toLowerCase();

            return homeTeamMatch || awayTeamMatch;
          });
        });

        setScores(filteredScores);
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

  if (scores.length === 0) {
    return <div className="no-games">No active games at the moment</div>;
  }

  return (
    <div className="live-scores">
      <h2>Live Sports Scores</h2>
      <div className="scores-grid">
        {scores.map((score) => (
          <div key={score.id} className="score-card">
            <div className="game-header">
              <span className="sport">{score.sport}</span>
              <span className="status">{score.status}</span>
            </div>
            <div className="teams">
              <div className="team home">
                <span className="team-name">{score.homeTeam}</span>
                <span className="score">{score.homeScore}</span>
              </div>
              <div className="team away">
                <span className="team-name">{score.awayTeam}</span>
                <span className="score">{score.awayScore}</span>
              </div>
            </div>
            <div className="game-info">
              <span className="period">
                {score.sport === 'MLB' ? `Inning ${score.period}` :
                 score.sport === 'NBA' ? `Q${score.period}` :
                 score.sport === 'NFL' ? `Q${score.period}` :
                 `Period ${score.period}`}
              </span>
              <span className="time">{score.timeRemaining}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 