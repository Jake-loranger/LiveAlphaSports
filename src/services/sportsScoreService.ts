import axios from 'axios';

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

export class SportsScoreService {
  private static instance: SportsScoreService;
  private readonly ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
  private readonly SPORTS = {
    MLB: '/baseball/mlb/scoreboard',
    NBA: '/basketball/nba/scoreboard',
    NFL: '/football/nfl/scoreboard',
    NHL: '/hockey/nhl/scoreboard'
  };

  private constructor() {}

  public static getInstance(): SportsScoreService {
    if (!SportsScoreService.instance) {
      SportsScoreService.instance = new SportsScoreService();
    }
    return SportsScoreService.instance;
  }

  public async getLiveScores(sport: keyof typeof this.SPORTS): Promise<GameScore[]> {
    try {
      const response = await axios.get(`${this.ESPN_API_BASE}${this.SPORTS[sport]}`);
      const events = response.data.events;
      
      return events.map((event: any) => ({
        id: event.id,
        homeTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').team.name,
        awayTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').team.name,
        homeScore: parseInt(event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').score),
        awayScore: parseInt(event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').score),
        status: event.status.type.name,
        period: this.getPeriod(event.status.period, sport),
        timeRemaining: event.status.displayClock,
        sport
      }));
    } catch (error) {
      console.error(`Error fetching ${sport} scores:`, error);
      return [];
    }
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

  public async getAllLiveScores(): Promise<GameScore[]> {
    const allScores: GameScore[] = [];
    
    for (const sport of Object.keys(this.SPORTS) as Array<keyof typeof this.SPORTS>) {
      const scores = await this.getLiveScores(sport);
      allScores.push(...scores);
    }
    
    return allScores;
  }
} 