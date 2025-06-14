import axios from 'axios';

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
  inningState?: string;
}

interface LiveGame {
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

interface AlphaArcadeResponse {
  markets: Market[];
}

export class LiveScoresService {
  private static instance: LiveScoresService;
  private readonly ALPHA_ARCADE_API_URL = 'https://g08245wvl7.execute-api.us-east-1.amazonaws.com/api/get-markets';
  private readonly ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
  private readonly SPORTS = {
    MLB: '/baseball/mlb/scoreboard',
    NBA: '/basketball/nba/scoreboard',
    NFL: '/football/nfl/scoreboard',
    NHL: '/hockey/nhl/scoreboard'
  };
  private lastFetchTime: number = 0;
  private readonly FETCH_INTERVAL = 30000; // 30 seconds
  private cachedLiveGames: LiveGame[] = [];

  private constructor() {}

  public static getInstance(): LiveScoresService {
    if (!LiveScoresService.instance) {
      LiveScoresService.instance = new LiveScoresService();
    }
    return LiveScoresService.instance;
  }

  private async fetchAlphaArcadeMarkets(): Promise<Market[]> {
    try {
      const response = await axios.get<AlphaArcadeResponse>(this.ALPHA_ARCADE_API_URL, {
        params: { activeOnly: true }
      });
      return response.data.markets;
    } catch (error) {
      console.error('Error fetching Alpha Arcade markets:', error);
      return [];
    }
  }

  private async fetchSportsScores(): Promise<GameScore[]> {
    const allScores: GameScore[] = [];
    
    for (const sport of Object.keys(this.SPORTS) as Array<keyof typeof this.SPORTS>) {
      try {
        const response = await axios.get(`${this.ESPN_API_BASE}${this.SPORTS[sport]}`);
        const events = response.data.events;
        
        const scores = events.map((event: any) => {
          const status = event.status;
          let inningState: string | undefined;
          
          if (sport === 'MLB' && status.type.detail) {
            const detail = status.type.detail;
            if (detail.includes('Top')) {
              inningState = 'Top';
            } else if (detail.includes('Bottom')) {
              inningState = 'Bottom';
            }
          }

          return {
            id: event.id,
            homeTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').team.name,
            awayTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').team.name,
            homeScore: parseInt(event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').score),
            awayScore: parseInt(event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').score),
            status: status.type.name,
            period: this.getPeriod(status.period, sport),
            timeRemaining: status.displayClock,
            sport,
            inningState
          };
        });
        
        allScores.push(...scores);
      } catch (error) {
        console.error(`Error fetching ${sport} scores:`, error);
      }
    }
    
    return allScores;
  }

  private getPeriod(period: number, sport: string): number {
    switch (sport) {
      case 'MLB':
        return period; // Inning
      case 'NBA':
        return period; // Quarter
      case 'NFL':
        return period; // Quarter
      case 'NHL':
        return period; // Period
      default:
        return period;
    }
  }

  private getTeamsFromMarket(market: Market): { homeTeam: string; awayTeam: string } | null {
    if (!market.secondaryTitle) return null;
    
    const match = market.secondaryTitle.match(/(.+) vs. (.+)/);
    if (!match) return null;
    
    return {
      homeTeam: match[1].trim(),
      awayTeam: match[2].trim()
    };
  }

  private getActiveSportsMarkets(markets: Market[]): Market[] {
    return markets.filter(market => 
      market.categories.some(category => 
        category.startsWith('SPORT') || 
        ['Baseball', 'Basketball', 'Football', 'Hockey'].includes(category)
      ) && 
      market.marketVolume > 0
    );
  }

  private combineMarketAndScoreData(markets: Market[], scores: GameScore[]): LiveGame[] {
    const activeMarkets = this.getActiveSportsMarkets(markets);
    
    return scores.filter(score => {
      return activeMarkets.some(market => {
        const teams = this.getTeamsFromMarket(market);
        if (!teams) return false;

        const homeTeamMatch = 
          teams.homeTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
          teams.homeTeam.toLowerCase() === score.awayTeam.toLowerCase();
        
        const awayTeamMatch = 
          teams.awayTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
          teams.awayTeam.toLowerCase() === score.awayTeam.toLowerCase();

        return homeTeamMatch || awayTeamMatch;
      });
    }).map(score => {
      const matchingMarket = activeMarkets.find(market => {
        const teams = this.getTeamsFromMarket(market);
        if (!teams) return false;

        const homeTeamMatch = 
          teams.homeTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
          teams.homeTeam.toLowerCase() === score.awayTeam.toLowerCase();
        
        const awayTeamMatch = 
          teams.awayTeam.toLowerCase() === score.homeTeam.toLowerCase() ||
          teams.awayTeam.toLowerCase() === score.awayTeam.toLowerCase();

        return homeTeamMatch || awayTeamMatch;
      });

      return {
        ...score
      };
    });
  }

  public async getLiveGames(): Promise<LiveGame[]> {
    const currentTime = Date.now();
    
    // Return cached data if it's fresh enough
    if (currentTime - this.lastFetchTime < this.FETCH_INTERVAL && this.cachedLiveGames.length > 0) {
      return this.cachedLiveGames;
    }

    try {
      // Fetch both markets and scores in parallel
      const [markets, scores] = await Promise.all([
        this.fetchAlphaArcadeMarkets(),
        this.fetchSportsScores()
      ]);

      // Combine the data
      this.cachedLiveGames = this.combineMarketAndScoreData(markets, scores);
      this.lastFetchTime = currentTime;

      return this.cachedLiveGames;
    } catch (error) {
      console.error('Error fetching live games:', error);
      // Return cached data if available
      if (this.cachedLiveGames.length > 0) {
        return this.cachedLiveGames;
      }
      throw error;
    }
  }
} 