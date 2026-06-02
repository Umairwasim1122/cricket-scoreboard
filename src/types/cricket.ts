export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  teams: string[];
  createdAt: string;
}

export interface BallEvent {
  runs: number;
  extra?: 'wide' | 'noBall' | 'bye' | 'legBye';
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'runOut' | 'retiredHurt';
  timestamp: string;
}

export interface Innings {
  battingTeam: string;
  bowlingTeam: string;
  balls: BallEvent[];
  isComplete: boolean;
  totalRuns: number;
  wickets: number;
  overs: number;
  byes?: number;
  legByes?: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  teamA: string;
  teamB: string;
  totalOvers: number;
  inningsTimerMinutes?: number;
  innings: Innings[];
  currentInnings: 0 | 1;
  status: 'scheduled' | 'live' | 'paused' | 'innings_break' | 'completed';
  result?: string;
  winner?: string;
  publicView: 'score' | 'target' | 'result' | 'break';
  createdAt: string;
  completedAt?: string;
  timerStartedAt?: string;
  timerPausedTime?: number;
}

export interface MatchHistory {
  id: string;
  tournamentId: string;
  tournamentName: string;
  teamA: string;
  teamB: string;
  winner: string;
  result: string;
  finalScoreA: string;
  finalScoreB: string;
  completedAt: string;
}
