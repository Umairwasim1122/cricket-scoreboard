import { useCricketStore } from "@/store/cricketStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { RotateCcw, MonitorPlay, Flag, Play, ExternalLink, Tv2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISPLAY_ROUTES: Record<string, string> = {
  score: "display",
  target: "display/target",
  result: "display/result",
  break: "display/break",
};

function openDisplay(view: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  window.open(`${base}/${DISPLAY_ROUTES[view]}`, "_blank");
}

export default function Dashboard() {
  const {
    activeMatchId,
    matches,
    scoreRuns,
    scoreExtra,
    takeWicket,
    undoLastBall,
    endOver,
    updateMatch,
    setPublicView,
    startNewInnings,
    endMatch,
    breakMessage,
    setBreakMessage,
  } = useCricketStore();

  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [breakInput, setBreakInput] = useState(breakMessage);

  const prevBallsRef   = useRef<number>(0);
  const prevWicketsRef = useRef<number>(0);
  const prevRunsRef    = useRef<number>(0);
  const matchEndedRef  = useRef<boolean>(false);

  const match = matches.find((m) => m.id === activeMatchId);

  const flashAction = useCallback((label: string) => setLastActionLabel(label), []);

  const handleScoreRuns = useCallback((runs: number) => {
    scoreRuns(runs);
    flashAction(runs === 0 ? "Dot Ball" : runs === 4 ? "FOUR!" : runs === 6 ? "SIX!" : `${runs} Run${runs > 1 ? "s" : ""}`);
  }, [scoreRuns, flashAction]);

  const handleExtra = useCallback((type: "wide" | "noBall" | "bye" | "legBye", runs: number) => {
    scoreExtra(type, runs);
    const labels: Record<string, string> = { wide: "Wide", noBall: "No Ball", bye: "Bye", legBye: "Leg Bye" };
    flashAction(labels[type]);
  }, [scoreExtra, flashAction]);

  const handleWicket = useCallback(() => {
    takeWicket();
    flashAction("WICKET!");
  }, [takeWicket, flashAction]);

  // Reset guards whenever the active match changes
  useEffect(() => {
    matchEndedRef.current  = false;
    prevBallsRef.current   = 0;
    prevWicketsRef.current = 0;
    prevRunsRef.current    = 0;
  }, [activeMatchId]);

  // ── Core auto-detection effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!match || match.status !== "live") return;
    if (matchEndedRef.current) return;

    const innings    = match.innings[match.currentInnings];
    const validBalls = innings.balls.filter(b => b.extra !== "wide" && b.extra !== "noBall");
    const totalValid = validBalls.length;
    const thisOver   = totalValid % 6;

    const ballsChanged   = totalValid          !== prevBallsRef.current;
    const wicketsChanged = innings.wickets     !== prevWicketsRef.current;
    const runsChanged    = innings.totalRuns   !== prevRunsRef.current;
    const anythingNew    = ballsChanged || wicketsChanged || runsChanged;

    const finishMatch = (winner: string, result: string) => {
      matchEndedRef.current = true;
      endMatch(winner, result);
      setPublicView("result");
    };

    // ── 1st innings ──────────────────────────────────────────────────────────
    if (match.currentInnings === 0) {
      // Auto end-over
      if (totalValid > 0 && ballsChanged && thisOver === 0) {
        prevBallsRef.current = totalValid;
        endOver();
        flashAction("Over Complete — Auto Ended");
        return;
      }
      prevBallsRef.current = totalValid;

      // All out → innings break
      if (innings.wickets >= 10 && wicketsChanged) {
        prevWicketsRef.current = innings.wickets;
        setPublicView("break");
        updateMatch({ ...match, status: "innings_break" });
        flashAction("All Out — Innings Ended");
        return;
      }
      prevWicketsRef.current = innings.wickets;
      prevRunsRef.current    = innings.totalRuns;
      return;
    }

    // ── 2nd innings ──────────────────────────────────────────────────────────
    if (!anythingNew) return;

    const inn1          = match.innings[0];
    const inn2          = match.innings[1];
    const target        = inn1.totalRuns + 1;
    const runsScored    = inn2.totalRuns;
    const wicketsFallen = inn2.wickets;
    const wicketsLeft   = 10 - wicketsFallen;

    const ballsBowled    = inn2.overs * 6 + (validBalls.length % 6);
    const totalBalls     = match.totalOvers * 6;
    const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
    const runsNeeded     = target - runsScored;

    // Commit new values immediately so we don't double-fire
    prevBallsRef.current   = totalValid;
    prevWicketsRef.current = wicketsFallen;
    prevRunsRef.current    = runsScored;

    // 1. Target chased — batting team wins
    if (runsScored >= target) {
      const spare = ballsRemaining > 0 ? ` & ${ballsRemaining} ball${ballsRemaining !== 1 ? "s" : ""} to spare` : "";
      finishMatch(
        inn2.battingTeam,
        `${inn2.battingTeam} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}${spare}`
      );
      flashAction(`🏆 ${inn2.battingTeam} WIN!`);
      return;
    }

    // 2. Scores level + overs exhausted or all out → Tie
    if (runsScored === inn1.totalRuns && (ballsRemaining === 0 || wicketsFallen >= 10)) {
      finishMatch("Tie", "Match Tied — Scores Level");
      flashAction("🤝 SCORES LEVEL — TIE!");
      return;
    }

    // 3. All out in 2nd innings (didn't reach target or tie above)
    if (wicketsFallen >= 10) {
      const margin = inn1.totalRuns - runsScored;
      finishMatch(
        inn1.battingTeam,
        `${inn1.battingTeam} won by ${margin} run${margin !== 1 ? "s" : ""}`
      );
      flashAction(`🏆 ${inn1.battingTeam} WIN!`);
      return;
    }

    // 4. Overs exhausted — chase failed (runs still needed but no balls left)
    if (ballsRemaining === 0 && runsNeeded > 0) {
      const margin = inn1.totalRuns - runsScored;
      finishMatch(
        inn1.battingTeam,
        `${inn1.battingTeam} won by ${margin} run${margin !== 1 ? "s" : ""}`
      );
      flashAction(`🏆 ${inn1.battingTeam} WIN!`);
      return;
    }

    // 5. Auto end-over (6 valid balls, match still ongoing)
    if (totalValid > 0 && ballsChanged && thisOver === 0) {
      endOver();
      flashAction("Over Complete — Auto Ended");
    }
  }, [match?.innings, match?.currentInnings, match?.status]);

  useEffect(() => {
    if (!lastActionLabel) return;
    const t = setTimeout(() => setLastActionLabel(null), 6000);
    return () => clearTimeout(t);
  }, [lastActionLabel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!match || match.status !== "live") return;
      if (e.key === "1") handleScoreRuns(1);
      if (e.key === "4") handleScoreRuns(4);
      if (e.key === "6") handleScoreRuns(6);
      if (e.key === "w" || e.key === "W") handleWicket();
      if (e.key === "z" || e.key === "Z") undoLastBall();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [match, handleScoreRuns, handleWicket, undoLastBall]);

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Match</h2>
          <p className="text-muted-foreground">Select or create a match in the Matches tab.</p>
        </div>
      </div>
    );
  }

  if (match.status === "completed") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-card p-12 rounded-xl border border-border">
          <h2 className="text-3xl font-bold text-success mb-2">Match Completed</h2>
          <p className="text-muted-foreground mb-6">{match.result}</p>
          <Button onClick={() => { setPublicView("result"); openDisplay("result"); }}>
            <ExternalLink className="w-4 h-4 mr-2" /> Show Result Screen
          </Button>
        </div>
      </div>
    );
  }

  const innings   = match.innings[match.currentInnings];
  const isLive    = match.status === "live";
  const validBalls = innings.balls.filter((b) => b.extra !== "wide" && b.extra !== "noBall");
  const oversText  = `${innings.overs}.${validBalls.length % 6}`;

  const toggleStatus = () => {
    updateMatch({ ...match, status: match.status === "live" ? "paused" : "live" });
  };

  const handleEndMatch = () => {
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    let winner = "", result = "";
    if (inn2.totalRuns > inn1.totalRuns) {
      const wl = 10 - inn2.wickets;
      winner = inn2.battingTeam;
      result = `${inn2.battingTeam} won by ${wl} wicket${wl !== 1 ? "s" : ""}`;
    } else if (inn1.totalRuns > inn2.totalRuns) {
      const m = inn1.totalRuns - inn2.totalRuns;
      winner = inn1.battingTeam;
      result = `${inn1.battingTeam} won by ${m} run${m !== 1 ? "s" : ""}`;
    } else {
      winner = "Tie";
      result = "Match Tied — Scores Level";
    }
    matchEndedRef.current = true;
    endMatch(winner, result);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* LEFT: Match Info */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Match Status</h2>
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isLive ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
              {match.status.toUpperCase()}
            </span>
            <Button variant="outline" size="sm" onClick={toggleStatus}>
              {isLive ? "Pause" : "Start"}
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{match.teamA} vs {match.teamB}</p>
              <h3 className="text-xl font-bold text-primary">{innings.battingTeam} Batting</h3>
            </div>
            <div className="pt-4 border-t border-border">
              <div className="text-5xl font-display font-bold text-foreground">
                {innings.totalRuns}<span className="text-muted-foreground text-3xl">/{innings.wickets}</span>
              </div>
              <div className="text-lg text-muted-foreground mt-1">Overs: {oversText} / {match.totalOvers}</div>
            </div>
          </div>
        </div>

        {match.currentInnings === 1 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Target</h2>
            <div className="text-3xl font-display font-bold text-accent">
              {match.innings[0].totalRuns + 1}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Need {Math.max(0, match.innings[0].totalRuns + 1 - innings.totalRuns)} runs to win
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {match.currentInnings === 0 && (
            <Button variant="outline" className="w-full bg-card hover:bg-secondary border-primary/50 text-primary"
              onClick={() => { setPublicView("break"); updateMatch({ ...match, status: "innings_break" }); }}>
              Take Innings Break
            </Button>
          )}
          {match.currentInnings === 0 && (
            <Button variant="default" className="w-full bg-primary hover:bg-primary/90 text-white" onClick={startNewInnings}>
              <Play className="w-4 h-4 mr-2" /> Start 2nd Innings
            </Button>
          )}
          <Button variant="destructive" className="w-full" onClick={handleEndMatch}>
            <Flag className="w-4 h-4 mr-2" /> End Match
          </Button>
        </div>
      </div>

      {/* CENTER: Controls */}
      <div className="lg:col-span-6 space-y-4">
        <AnimatePresence>
          {lastActionLabel && (
            <motion.div
              key="score-banner"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between bg-success/10 border border-success/40 rounded-xl px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-bold text-lg tracking-wide">{lastActionLabel}</span>
                <span className="text-muted-foreground text-sm">— score updated</span>
              </div>
              <Button size="sm"
                className="bg-success hover:bg-success/90 text-success-foreground font-bold gap-2"
                onClick={() => { setPublicView("score"); openDisplay("score"); setLastActionLabel(null); }}
                data-testid="button-push-score-screen"
              >
                <Tv2 className="w-4 h-4" /> Open Score Screen
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((runs) => (
            <Button key={runs} disabled={!isLive} onClick={() => handleScoreRuns(runs)}
              className="h-20 text-3xl font-display bg-secondary hover:bg-secondary/80 text-foreground"
              data-testid={`button-score-${runs}`}>
              {runs}
            </Button>
          ))}
          <Button disabled={!isLive} onClick={() => handleScoreRuns(4)}
            className="h-20 text-3xl font-display bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-score-4">4</Button>
          <Button disabled={!isLive} onClick={() => handleScoreRuns(6)}
            className="h-20 text-3xl font-display bg-accent hover:bg-accent/90 text-accent-foreground"
            data-testid="button-score-6">6</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Button disabled={!isLive} onClick={() => handleExtra("wide", 0)} variant="outline" className="h-16 text-lg font-bold" data-testid="button-extra-wide">WD</Button>
          <Button disabled={!isLive} onClick={() => handleExtra("noBall", 0)} variant="outline" className="h-16 text-lg font-bold" data-testid="button-extra-noball">NB</Button>
          <Button disabled={!isLive} onClick={() => { const v = parseInt(window.prompt('Bye runs', '1') || '0', 10); if (Number.isFinite(v) && v > 0) handleExtra('bye', v); }} variant="outline" className="h-16 text-lg font-bold" data-testid="button-extra-bye">B</Button>
          <Button disabled={!isLive} onClick={() => { const v = parseInt(window.prompt('Leg bye runs', '1') || '0', 10); if (Number.isFinite(v) && v > 0) handleExtra('legBye', v); }} variant="outline" className="h-16 text-lg font-bold" data-testid="button-extra-legbye">LB</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button disabled={!isLive} onClick={handleWicket}
            className="h-24 text-4xl font-display bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            data-testid="button-wicket">WICKET</Button>
          <div className="grid grid-rows-2 gap-4">
            <Button disabled={!isLive} onClick={undoLastBall} variant="outline"
              className="h-full flex items-center justify-center gap-2 text-lg" data-testid="button-undo">
              <RotateCcw className="w-5 h-5" /> Undo Last (Z)
            </Button>
            <Button disabled={!isLive} onClick={endOver}
              className="h-full text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
              data-testid="button-end-over">End Over</Button>
          </div>
        </div>
      </div>

      {/* RIGHT: Display Control & Over History */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <MonitorPlay className="w-4 h-4" /> Display Output
          </h2>
          <div className="flex flex-col gap-2">
            <button data-testid="button-display-score"
              onClick={() => { setPublicView("score"); openDisplay("score"); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-semibold transition-all
                ${match.publicView === "score" ? "bg-primary border-primary text-primary-foreground" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
              <span>Score Screen</span><ExternalLink className="w-4 h-4 opacity-60" />
            </button>
            {match.currentInnings === 1 && (
              <button data-testid="button-display-target"
                onClick={() => { setPublicView("target"); openDisplay("target"); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-semibold transition-all
                  ${match.publicView === "target" ? "bg-primary border-primary text-primary-foreground" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
                <span>Target Screen</span><ExternalLink className="w-4 h-4 opacity-60" />
              </button>
            )}
            {match.currentInnings === 0 && (
              <button data-testid="button-display-break"
                onClick={() => { setPublicView("break"); updateMatch({ ...match, status: "innings_break" }); openDisplay("break"); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-semibold transition-all
                  ${match.publicView === "break" ? "bg-warning/80 border-warning text-white" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
                <span>Break Screen</span><ExternalLink className="w-4 h-4 opacity-60" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">Opens in new window</p>
        </div>

        {match.currentInnings === 0 && (
          <div className="bg-card border border-warning/30 rounded-xl p-6">
            <h2 className="text-xs font-bold text-warning uppercase tracking-wider mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" /> Break Screen Message
            </h2>
            <textarea data-testid="input-break-message" value={breakInput} onChange={e => setBreakInput(e.target.value)}
              placeholder="Type a message for the break screen..." rows={3}
              className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-warning/60 transition-colors" />
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground font-bold gap-2"
                onClick={() => setBreakMessage(breakInput)} data-testid="button-send-break-message">
                <Send className="w-4 h-4" /> Send to Screen
              </Button>
              {breakMessage && (
                <Button size="sm" variant="outline" className="text-muted-foreground"
                  onClick={() => { setBreakInput(""); setBreakMessage(""); }} data-testid="button-clear-break-message">
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">This Over</h2>
          <div className="flex flex-wrap gap-2">
            {innings.balls.slice(-6).map((b, i) => (
              <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                ${b.isWicket ? "bg-destructive text-destructive-foreground" :
                  b.runs === 6 ? "bg-accent text-accent-foreground" :
                  b.runs === 4 ? "bg-primary text-primary-foreground" :
                  b.extra ? "bg-warning text-warning-foreground" :
                  "bg-secondary text-secondary-foreground"}`}>
                {b.isWicket ? "W" : (b.extra ? `${b.runs}${b.extra[0].toUpperCase()}` : b.runs)}
              </div>
            ))}
            {innings.balls.length === 0 && <span className="text-muted-foreground text-sm">No balls bowled</span>}
          </div>
        </div>
      </div>
    </div>
  );
}