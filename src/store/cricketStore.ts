import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BallEvent, Match, MatchHistory, Tournament, Innings } from '../types/cricket';
import { dbHelpers } from '../database/indexedDB';
import { broadcastService } from '../services/broadcastService';

interface CricketState {
  tournaments: Tournament[];
  matches: Match[];
  history: MatchHistory[];
  activeMatchId: string | null;
  lastEvent: 'four' | 'six' | 'wicket' | 'wide' | 'noBall' | null;
  breakMessage: string;

  // Actions
  setLastEvent: (event: 'four' | 'six' | 'wicket' | 'wide' | 'noBall' | null) => void;
  syncState: (state: Partial<CricketState>) => void;
  setBreakMessage: (msg: string) => void;
  
  addTournament: (tournament: Tournament) => void;
  updateTournament: (tournament: Tournament) => void;
  deleteTournament: (id: string) => void;
  addMatch: (match: Match) => void;
  setActiveMatchId: (id: string | null) => void;
  updateMatch: (match: Match) => void;
  deleteMatch: (id: string) => void;
  deleteMatchHistory: (id: string) => void;
  redoStack: BallEvent[];
  
  // Scoring
  scoreRuns: (runs: number, isBoundary?: boolean) => void;
  scoreExtra: (type: 'wide' | 'noBall' | 'bye' | 'legBye', runs: number) => void;
  takeWicket: (type?: 'bowled' | 'caught' | 'runOut' | 'retiredHurt', runs?: number) => void;
  undoLastBall: () => void;
  redoLastBall: () => void;
  endOver: () => void;
  startNewInnings: () => void;
  pauseMatch: () => void;
  resumeMatch: () => void;
  endMatch: (winner: string, resultStr: string) => void;
  setPublicView: (view: 'score' | 'target' | 'result' | 'break') => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const seedTournaments: Tournament[] = [];
const seedHistory: MatchHistory[] = [];
const seedMatches: Match[] = [];

export const useCricketStore = create<CricketState>()(
  persist(
    (set, get) => ({
      tournaments: seedTournaments,
      matches: seedMatches,
      history: seedHistory,
      activeMatchId: null,
      lastEvent: null,
      breakMessage: '',
      redoStack: [],

      setLastEvent: (event) => set({ lastEvent: event }),
      syncState: (state) => set(state as any),
      setBreakMessage: (msg) => set(state => {
        broadcastService.broadcast({ breakMessage: msg, activeMatchId: state.activeMatchId });
        return { breakMessage: msg };
      }),
      
      addTournament: (tournament) => set(state => {
        const newTournaments = [...state.tournaments, tournament];
        return { tournaments: newTournaments };
      }),
      updateTournament: (tournament) => set(state => {
        const newTournaments = state.tournaments.map(t => t.id === tournament.id ? tournament : t);
        broadcastService.broadcast({ tournaments: newTournaments, activeMatchId: state.activeMatchId });
        return { tournaments: newTournaments };
      }),
      deleteTournament: (id) => set(state => {
        const newTournaments = state.tournaments.filter(t => t.id !== id);
        broadcastService.broadcast({ tournaments: newTournaments, activeMatchId: state.activeMatchId });
        return { tournaments: newTournaments };
      }),
      
      addMatch: (match) => set(state => {
        return { matches: [...state.matches, match] };
      }),
      redoStack: [],
      
      setActiveMatchId: (id) => set({ activeMatchId: id }),
      
      updateMatch: (match) => set(state => {
        const newMatches = state.matches.map(m => m.id === match.id ? match : m);
        broadcastService.broadcast({
          matches: newMatches,
          activeMatchId: state.activeMatchId,
          breakMessage: state.breakMessage,
          lastEvent: state.lastEvent
        });
        return { matches: newMatches };
      }),

      deleteMatch: (id) => set(state => {
        const newMatches = state.matches.filter(m => m.id !== id);
        const activeMatchId = state.activeMatchId === id ? null : state.activeMatchId;
        broadcastService.broadcast({
          matches: newMatches,
          activeMatchId,
          breakMessage: state.breakMessage,
          lastEvent: state.lastEvent
        });
        return { matches: newMatches, activeMatchId };
      }),

      deleteMatchHistory: (id) => set(state => {
        const newHistory = state.history.filter(h => h.id !== id);
        broadcastService.broadcast({ history: newHistory, activeMatchId: state.activeMatchId });

        // Background sync to IDB (no-op if helper isn't defined yet)
        dbHelpers.deleteMatchHistory?.(id);

        return { history: newHistory };
      }),

      setPublicView: (view) => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match) return state;
        
        const updatedMatch = { ...match, publicView: view };
        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches };
      }),

      scoreRuns: (runs, isBoundary) => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'live') return state;

        const currentInnings = match.innings[match.currentInnings];
        
        // Validate: don't allow more balls than overs permit
        const validBalls = currentInnings.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
        const maxBalls = match.totalOvers * 6;
        if (validBalls.length >= maxBalls) return state;

        const newBall: BallEvent = { runs, isWicket: false, timestamp: new Date().toISOString() };
        
        // Initialize timer for first innings if not already started
        const timerStartedAt = match.timerStartedAt || (match.currentInnings === 0 ? new Date().toISOString() : match.timerStartedAt);

        const updatedInnings = {
          ...currentInnings,
          balls: [...currentInnings.balls, newBall],
          totalRuns: currentInnings.totalRuns + runs,
        };

        const updatedMatch = {
          ...match,
          timerStartedAt,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        
        const event = runs === 6 ? 'six' : runs === 4 ? 'four' : null;
        if (event) {
          setTimeout(() => get().setLastEvent(null), 3000);
        }

        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId, lastEvent: event });
        return { matches: newMatches, lastEvent: event, redoStack: [] };
      }),

      scoreExtra: (type, runs) => set(state => {
         if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'live') return state;

        const currentInnings = match.innings[match.currentInnings];
        
        // For non-wide/noBall extras, validate ball count
        if (type !== 'wide' && type !== 'noBall') {
          const validBalls = currentInnings.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
          const maxBalls = match.totalOvers * 6;
          if (validBalls.length >= maxBalls) return state;
        }

        const newBall: BallEvent = { runs, extra: type, isWicket: false, timestamp: new Date().toISOString() };

        // Initialize timer for first innings if not already started
        const timerStartedAt = match.timerStartedAt || (match.currentInnings === 0 ? new Date().toISOString() : match.timerStartedAt);

        const extraBonus = (type === 'wide' || type === 'noBall') ? 1 : 0;
        const addRuns = runs + extraBonus;

        const updatedInnings = {
          ...currentInnings,
          balls: [...currentInnings.balls, newBall],
          totalRuns: currentInnings.totalRuns + addRuns,
          byes: (currentInnings.byes || 0) + (type === 'bye' ? runs : 0),
          legByes: (currentInnings.legByes || 0) + (type === 'legBye' ? runs : 0),
        };

        const updatedMatch = {
          ...match,
          timerStartedAt,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        const event = type === 'wide' || type === 'noBall' ? type : null;
        if (event) {
          setTimeout(() => get().setLastEvent(null), 3000);
        }
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId, lastEvent: event });
        return { matches: newMatches, lastEvent: event, redoStack: [] };
      }),

      takeWicket: (type = 'bowled', runs = 0) => set(state => {
         if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'live') return state;

        const currentInnings = match.innings[match.currentInnings];
        
        // Validate: don't allow more balls than overs permit
        const validBalls = currentInnings.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
        const maxBalls = match.totalOvers * 6;
        if (validBalls.length >= maxBalls) return state;

        const wicketRuns = type === 'runOut' ? runs : 0;
        const newBall: BallEvent = {
          runs: wicketRuns,
          isWicket: true,
          wicketType: type,
          timestamp: new Date().toISOString()
        };

        // Initialize timer for first innings if not already started
        const timerStartedAt = match.timerStartedAt || (match.currentInnings === 0 ? new Date().toISOString() : match.timerStartedAt);
        
        const updatedInnings = {
          ...currentInnings,
          balls: [...currentInnings.balls, newBall],
          wickets: currentInnings.wickets + 1,
          totalRuns: currentInnings.totalRuns + wicketRuns,
        };

        const updatedMatch = {
          ...match,
          timerStartedAt,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        
        setTimeout(() => get().setLastEvent(null), 3000);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId, lastEvent: 'wicket' });
        return { matches: newMatches, lastEvent: 'wicket', redoStack: [] };
      }),

      undoLastBall: () => set(state => {
         if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || (match.status !== 'live' && match.status !== 'completed')) return state;

        const currentInnings = match.innings[match.currentInnings];
        if (currentInnings.balls.length === 0) return state;

        const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
        const runsToDeduct = lastBall.runs + (lastBall.extra === 'wide' || lastBall.extra === 'noBall' ? 1 : 0);
        const remainingBalls = currentInnings.balls.slice(0, -1);
        const validBalls = remainingBalls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
        const updatedOvers = Math.floor(validBalls.length / 6);

        const updatedInnings = {
          ...currentInnings,
          balls: remainingBalls,
          totalRuns: currentInnings.totalRuns - runsToDeduct,
          wickets: currentInnings.wickets - (lastBall.isWicket ? 1 : 0),
          overs: updatedOvers,
          byes: (currentInnings.byes || 0) - (lastBall.extra === 'bye' ? lastBall.runs : 0),
          legByes: (currentInnings.legByes || 0) - (lastBall.extra === 'legBye' ? lastBall.runs : 0)
        };

        const updatedMatch = {
          ...match,
          status: match.status === 'completed' ? 'live' : match.status,
          winner: match.status === 'completed' ? undefined : match.winner,
          result: match.status === 'completed' ? undefined : match.result,
          completedAt: match.status === 'completed' ? undefined : match.completedAt,
          publicView: match.status === 'completed' ? 'score' : match.publicView,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches, redoStack: [...state.redoStack, lastBall] };
      }),

      redoLastBall: () => set(state => {
         if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match) return state;
        if (state.redoStack.length === 0) return state;

        const currentInnings = match.innings[match.currentInnings];
        const redoBall = state.redoStack[state.redoStack.length - 1];
        const remainingRedo = state.redoStack.slice(0, -1);

        const runsToAdd = redoBall.runs + (redoBall.extra === 'wide' || redoBall.extra === 'noBall' ? 1 : 0);

        const updatedInnings = {
          ...currentInnings,
          balls: [...currentInnings.balls, redoBall],
          totalRuns: currentInnings.totalRuns + runsToAdd,
          wickets: currentInnings.wickets + (redoBall.isWicket ? 1 : 0),
          byes: (currentInnings.byes || 0) + (redoBall.extra === 'bye' ? redoBall.runs : 0),
          legByes: (currentInnings.legByes || 0) + (redoBall.extra === 'legBye' ? redoBall.runs : 0)
        };

        const updatedMatch = {
          ...match,
          status: match.status === 'completed' ? 'live' : match.status,
          winner: match.status === 'completed' ? undefined : match.winner,
          result: match.status === 'completed' ? undefined : match.result,
          completedAt: match.status === 'completed' ? undefined : match.completedAt,
          publicView: match.status === 'completed' ? 'score' : match.publicView,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches, redoStack: remainingRedo };
      }),

      endOver: () => set(state => {
         if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'live') return state;

        const currentInnings = match.innings[match.currentInnings];

        // Don't exceed total overs
        if (currentInnings.overs >= match.totalOvers) return state;

        const updatedInnings = {
          ...currentInnings,
          overs: currentInnings.overs + 1,
        };

        const updatedMatch = {
          ...match,
          innings: match.innings.map((inn, i) => i === match.currentInnings ? updatedInnings : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches };
      }),

      startNewInnings: () => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.currentInnings === 1) return state;

        const updatedMatch = {
          ...match,
          currentInnings: 1 as const,
          status: 'live' as const,
          publicView: 'target' as const,
          timerStartedAt: new Date().toISOString(),
          timerPausedTime: undefined,
          innings: match.innings.map((inn, i) => i === 0 ? { ...inn, isComplete: true } : inn)
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches };
      }),

      pauseMatch: () => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'live') return state;

        const currentTime = Date.now();
        const startTime = match.timerStartedAt ? new Date(match.timerStartedAt).getTime() : currentTime;
        const pausedTime = match.timerPausedTime ?? 0;
        const elapsedMs = currentTime - startTime + pausedTime;

        const updatedMatch = {
          ...match,
          status: 'paused' as const,
          timerPausedTime: elapsedMs
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches };
      }),

      resumeMatch: () => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match || match.status !== 'paused') return state;

        const updatedMatch = {
          ...match,
          status: 'live' as const,
          timerStartedAt: new Date(Date.now() - (match.timerPausedTime ?? 0)).toISOString()
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        return { matches: newMatches };
      }),

      endMatch: (winner, result) => set(state => {
        if (!state.activeMatchId) return state;
        const match = state.matches.find(m => m.id === state.activeMatchId);
        if (!match) return state;

        const updatedMatch = {
          ...match,
          status: 'completed' as const,
          winner,
          result,
          publicView: 'result' as const,
          completedAt: new Date().toISOString()
        };

        const tName = state.tournaments.find(t => t.id === match.tournamentId)?.name || 'Unknown';
        
        const historyEntry: MatchHistory = {
          id: match.id,
          tournamentId: match.tournamentId,
          tournamentName: tName,
          teamA: match.teamA,
          teamB: match.teamB,
          winner,
          result,
          finalScoreA: `${match.innings[0].totalRuns}/${match.innings[0].wickets}`,
          finalScoreB: `${match.innings[1].totalRuns}/${match.innings[1].wickets}`,
          completedAt: updatedMatch.completedAt!
        };

        const newMatches = state.matches.map(m => m.id === match.id ? updatedMatch : m);
        broadcastService.broadcast({ matches: newMatches, activeMatchId: state.activeMatchId });
        
        // Background sync to IDB
        dbHelpers.saveMatchHistory(historyEntry);

        return { 
          matches: newMatches,
          history: [...state.history, historyEntry]
        };
      })
    }),
    {
      name: 'cricket-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          broadcastService.broadcast({
            matches: state.matches,
            tournaments: state.tournaments,
            history: state.history,
            activeMatchId: state.activeMatchId,
            lastEvent: state.lastEvent,
            breakMessage: state.breakMessage
          });
        }
      }
    }
  )
);