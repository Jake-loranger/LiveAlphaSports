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
  // Add other fields as needed
}

interface AlphaArcadeResponse {
  markets: Market[];
}

const ALPHA_ARCADE_API_URL = 'https://g08245wvl7.execute-api.us-east-1.amazonaws.com/api/get-markets';

export class AlphaArcadeService {
  private static instance: AlphaArcadeService;
  private markets: Market[] = [];
  private lastFetchTime: number = 0;
  private readonly FETCH_INTERVAL = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): AlphaArcadeService {
    if (!AlphaArcadeService.instance) {
      AlphaArcadeService.instance = new AlphaArcadeService();
    }
    return AlphaArcadeService.instance;
  }

  public async getLiveMarkets(): Promise<Market[]> {
    const currentTime = Date.now();
    
    // Only fetch if enough time has passed since last fetch
    if (currentTime - this.lastFetchTime >= this.FETCH_INTERVAL) {
      try {
        const response = await axios.get<AlphaArcadeResponse>(ALPHA_ARCADE_API_URL, {
          params: { activeOnly: true }
        });
        
        this.markets = response.data.markets;
        this.lastFetchTime = currentTime;
      } catch (error) {
        console.error('Error fetching Alpha Arcade markets:', error);
        // Return cached data if available
        if (this.markets.length > 0) {
          return this.markets;
        }
        throw error;
      }
    }
    
    return this.markets;
  }

  public getActiveSportsMarkets(): Market[] {
    return this.markets.filter(market => 
      market.categories.some(category => 
        category.startsWith('SPORT') || 
        ['Baseball', 'Basketball', 'Football', 'Hockey'].includes(category)
      ) && 
      market.marketVolume > 0 // Only include markets with activity
    );
  }

  public getTeamsFromMarket(market: Market): { homeTeam: string; awayTeam: string } | null {
    if (!market.secondaryTitle) return null;
    
    const match = market.secondaryTitle.match(/(.+) vs. (.+)/);
    if (!match) return null;
    
    return {
      homeTeam: match[1].trim(),
      awayTeam: match[2].trim()
    };
  }
} 