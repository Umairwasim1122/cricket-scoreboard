import { useCricketStore } from "@/store/cricketStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { RotateCcw, MonitorPlay, Flag, Play, ExternalLink, Tv2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getMobileViewEnabled, getDisplayPopupFeatures } from "@/lib/settings";

type WicketReason = 'bowled' | 'caught' | 'runOut' | 'retiredHurt';

const DISPLAY_ROUTES: Record<string, string> = {
  score: "display",
  target: "display/target",
  result: "display/result",
  break: "display/break",
};

export default function Dashboard() {
  const openDisplay = useCallback((view: string) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${base}/${DISPLAY_ROUTES[view]}`;
    const name = `cricket-display-${view}`;
    const features = getDisplayPopupFeatures(getMobileViewEnabled());
    const popup = window.open(url, name, features);
    if (popup) popup.focus();
  }, []);
  const {
    activeMatchId,
    matches,
    scoreRuns,
    scoreExtra,
    takeWicket,
    undoLastBall,
    redoLastBall,
    endOver,
    updateMatch,
    setPublicView,
    startNewInnings,
    pauseMatch,
    resumeMatch,
    endMatch,
    breakMessage,
    setBreakMessage,
    redoStack,
  } = useCricketStore();

  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [breakInput, setBreakInput] = useState(breakMessage);
  const [extraModal, setExtraModal] = useState<'wide' | 'noBall' | 'bye' | 'legBye' | null>(null);
  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [selectedWicketType, setSelectedWicketType] = useState<WicketReason | null>(null);

  const prevBallsRef   = useRef<number>(0);
  const prevWicketsRef = useRef<number>(0);
  const prevRunsRef    = useRef<number>(0);
  const matchEndedRef  = useRef<boolean>(false);

  const match = matches.find((m) => m.id === activeMatchId);
  const canUndoRedo = match?.status === "live" || match?.status === "completed";

  const flashAction = useCallback((label: string) => setLastActionLabel(label), []);

  const handleScoreRuns = useCallback((runs: number) => {
    scoreRuns(runs);
    flashAction(runs === 0 ? "Dot Ball" : runs === 4 ? "FOUR!" : runs === 6 ? "SIX!" : `${runs} Run${runs > 1 ? "s" : ""}`);
  }, [scoreRuns, flashAction]);

  const handleExtra = useCallback((type: "wide" | "noBall" | "bye" | "legBye", runs: number) => {
    scoreExtra(type, runs);
    const labels: Record<string, string> = { wide: "Wide", noBall: "No Ball", bye: "Bye", legBye: "Leg Bye" };
    flashAction(`${labels[type]}${runs > 0 ? ` (${runs})` : ""}`);
    setExtraModal(null);
  }, [scoreExtra, flashAction]);

  const handleWicket = useCallback((type: WicketReason, runs: number = 0) => {
    takeWicket(type, runs);
    const label = type === 'runOut'
      ? `Run Out${runs > 0 ? ` (${runs})` : ''}`
      : type === 'retiredHurt'
      ? 'Retired Hurt'
      : type.charAt(0).toUpperCase() + type.slice(1);
    flashAction(label);
    setSelectedWicketType(null);
    setWicketModalOpen(false);
  }, [takeWicket, flashAction]);

  const openWicketModal = useCallback(() => {
    setSelectedWicketType(null);
    setWicketModalOpen(true);
  }, []);

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

    const ballsAdded     = totalValid          > prevBallsRef.current;
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
      // Auto end-over only on added balls, not on undo
      if (totalValid > 0 && ballsAdded && thisOver === 0) {
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
    if (totalValid > 0 && ballsAdded && thisOver === 0) {
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
      <div className="flex items-center justify-center h-full p-4">
        <div className="max-w-xl w-full space-y-4">
          <div className="text-center bg-card p-8 rounded-xl border border-border">
            <h2 className="text-3xl font-bold text-success mb-2">Match Completed</h2>
            <p className="text-muted-foreground mb-4">{match.result}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={() => { setPublicView("result"); openDisplay("result"); }}>
                <ExternalLink className="w-4 h-4 mr-2" /> Show Result Screen
              </Button>
              <Button disabled={!canUndoRedo} variant="outline" onClick={undoLastBall}>
                <RotateCcw className="w-4 h-4 mr-2" /> Undo Last Ball
              </Button>
            </div>
            <Button disabled={!redoStack.length} variant="outline" className="mt-3 w-full" onClick={redoLastBall}>
              Redo Last Ball
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              The session has ended, but you can still undo or redo the last ball if the final delivery needs correction.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const innings   = match.innings[match.currentInnings];
  const isLive    = match.status === "live";
  const validBalls = innings.balls.filter((b) => b.extra !== "wide" && b.extra !== "noBall");
  const oversText  = `${innings.overs}.${validBalls.length % 6}`;
  const secondInningsStarted = match.innings[1].balls.length > 0 || match.innings[1].isComplete;

  // Configure extra modal options based on type
  const extraModalConfig: Record<string, { title: string; runs: number[] }> = {
    wide:   { title: "Wide",     runs: [0, 1, 2, 3, 4] },
    noBall: { title: "No Ball",  runs: [0, 1, 2, 3, 4, 6] },
    bye:    { title: "Bye",      runs: [0, 1, 2, 3, 4] },
    legBye: { title: "Leg Bye",  runs: [0, 1, 2, 3, 4] },
  };

  const toggleStatus = () => {
    if (match.status === "scheduled") {
      updateMatch({ ...match, status: "live", timerStartedAt: new Date().toISOString() });
    } else if (match.status === "live") {
      pauseMatch();
    } else if (match.status === "paused") {
      resumeMatch();
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 lg:gap-6 min-h-0 w-full max-w-full">
      {/* EXTRA RUNS MODAL */}
      {extraModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg md:rounded-xl p-4 md:p-6 max-w-sm w-full">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">
              Select Runs for {extraModalConfig[extraModal].title}
            </h2>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {extraModalConfig[extraModal].runs.map((runs) => (
                <Button
                  key={runs}
                  onClick={() => handleExtra(extraModal, runs)}
                  className={`h-12 md:h-16 text-xl md:text-2xl font-bold ${
                    runs === 6
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                      : runs === 4
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  {runs}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 md:mt-4"
              onClick={() => setExtraModal(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {wicketModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg md:rounded-xl p-4 md:p-6 max-w-sm w-full">
            {!selectedWicketType ? (
              <>
                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Select Wicket Type</h2>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {['bowled', 'caught', 'runOut', 'retiredHurt'].map((type) => (
                    <Button
                      key={type}
                      onClick={() => setSelectedWicketType(type as WicketReason)}
                      className="h-12 md:h-16 text-sm md:text-base font-bold bg-secondary hover:bg-secondary/80 text-foreground"
                    >
                      {type === 'runOut' ? 'Run Out' : type === 'retiredHurt' ? 'Retire Hurt' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-3 md:mt-4"
                  onClick={() => setWicketModalOpen(false)}
                >
                  Cancel
                </Button>
              </>
            ) : selectedWicketType === 'runOut' ? (
              <>
                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Run Out Score</h2>
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                  {[0, 1, 2, 3, 4].map((runs) => (
                    <Button
                      key={runs}
                      onClick={() => handleWicket('runOut', runs)}
                      className={`h-12 md:h-16 text-xl md:text-2xl font-bold ${runs === 4 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                    >
                      {runs}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-3 md:mt-4"
                  onClick={() => setSelectedWicketType(null)}
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Confirm {selectedWicketType === 'retiredHurt' ? 'Retired Hurt' : selectedWicketType.charAt(0).toUpperCase() + selectedWicketType.slice(1)}</h2>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <Button
                    onClick={() => handleWicket(selectedWicketType)}
                    className="h-12 md:h-16 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedWicketType(null)}
                    className="h-12 md:h-16 text-base font-bold"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* LEFT: Match Info */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3 md:space-y-4 lg:space-y-6">
        <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Match Status</h2>
          <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
            <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${isLive ? "bg-success/20 text-success" : match.status === "scheduled" ? "bg-blue-500/20 text-blue-500" : "bg-warning/20 text-warning"}`}>
              {match.status.toUpperCase()}
            </span>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={toggleStatus}>
              {match.status === "scheduled" ? "Start" : isLive ? "Pause" : "Resume"}
            </Button>
          </div>
          <div className="space-y-2 md:space-y-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{match.teamA} vs {match.teamB}</p>
              <h3 className="text-lg md:text-xl font-bold text-primary">{innings.battingTeam} Batting</h3>
            </div>
            <div className="pt-2 md:pt-4 border-t border-border">
              <div className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground">
                {innings.totalRuns}<span className="text-muted-foreground text-xl md:text-2xl lg:text-3xl">/{innings.wickets}</span>
              </div>
              <div className="text-sm md:text-base lg:text-lg text-muted-foreground mt-1">Overs: {oversText} / {match.totalOvers}</div>
            </div>
          </div>
        </div>

        {match.currentInnings === 1 && (
          <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Target</h2>
            <div className="text-2xl md:text-3xl font-display font-bold text-accent">
              {match.innings[0].totalRuns + 1}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Need {Math.max(0, match.innings[0].totalRuns + 1 - innings.totalRuns)} runs to win
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 md:gap-3">
          {match.currentInnings === 0 && (
            <Button variant="outline" className="w-full bg-card hover:bg-secondary border-primary/50 text-primary text-sm md:text-base"
              onClick={() => { setPublicView("break"); updateMatch({ ...match, status: "innings_break" }); }}>
              Take Innings Break
            </Button>
          )}
          {match.currentInnings === 0 && (
            <Button variant="default" className="w-full bg-primary hover:bg-primary/90 text-white text-sm md:text-base" onClick={startNewInnings}>
              <Play className="w-3 h-3 md:w-4 md:h-4 mr-2" /> Start 2nd Innings
            </Button>
          )}
          {match.currentInnings === 1 && secondInningsStarted && (
            <Button variant="outline" className="w-full bg-card hover:bg-secondary border-primary/50 text-primary text-sm md:text-base"
              onClick={() => updateMatch({ ...match, currentInnings: 0 })}>
              Edit 1st Innings
            </Button>
          )}
          {match.currentInnings === 0 && secondInningsStarted && (
            <Button variant="outline" className="w-full bg-card hover:bg-secondary border-primary/50 text-primary text-sm md:text-base"
              onClick={() => updateMatch({ ...match, currentInnings: 1 })}>
              Return to 2nd Innings
            </Button>
          )}
          <Button variant="destructive" className="w-full text-sm md:text-base" onClick={handleEndMatch}>
            <Flag className="w-3 h-3 md:w-4 md:h-4 mr-2" /> End Match
          </Button>
        </div>
      </div>

      {/* CENTER: Controls */}
      <div className="col-span-1 md:col-span-2 lg:col-span-6 space-y-2 md:space-y-3 lg:space-y-4">
        <AnimatePresence>
          {lastActionLabel && (
            <motion.div
              key="score-banner"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col md:flex-row items-center justify-between gap-2 bg-success/10 border border-success/40 rounded-lg md:rounded-xl px-3 md:px-5 py-2 md:py-3"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-bold text-base md:text-lg tracking-wide">{lastActionLabel}</span>
                <span className="text-muted-foreground text-xs md:text-sm">— score updated</span>
              </div>
              <Button size="sm"
                className="bg-success hover:bg-success/90 text-success-foreground font-bold gap-2 w-full md:w-auto text-xs md:text-sm"
                onClick={() => { setPublicView("score"); openDisplay("score"); setLastActionLabel(null); }}
                data-testid="button-push-score-screen"
              >
                <Tv2 className="w-3 h-3 md:w-4 md:h-4" /> Open Score Screen
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-2 lg:gap-4">
          {[0, 1, 2, 3].map((runs) => (
            <Button key={runs} disabled={!isLive} onClick={() => handleScoreRuns(runs)}
              className="h-12 md:h-16 lg:h-20 text-xl md:text-2xl lg:text-3xl font-display bg-secondary hover:bg-secondary/80 text-foreground text-xs md:text-sm"
              data-testid={`button-score-${runs}`}>
              {runs}
            </Button>
          ))}
          <Button disabled={!isLive} onClick={() => handleScoreRuns(4)}
            className="h-12 md:h-16 lg:h-20 text-xl md:text-2xl lg:text-3xl font-display bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm"
            data-testid="button-score-4">4</Button>
          <Button disabled={!isLive} onClick={() => handleScoreRuns(6)}
            className="h-12 md:h-16 lg:h-20 text-xl md:text-2xl lg:text-3xl font-display bg-accent hover:bg-accent/90 text-accent-foreground text-xs md:text-sm"
            data-testid="button-score-6">6</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 lg:gap-4">
          <Button disabled={!isLive} onClick={() => setExtraModal("wide")} variant="outline" className="h-10 md:h-12 lg:h-16 text-xs md:text-sm lg:text-lg font-bold" data-testid="button-extra-wide">WD</Button>
          <Button disabled={!isLive} onClick={() => setExtraModal("noBall")} variant="outline" className="h-10 md:h-12 lg:h-16 text-xs md:text-sm lg:text-lg font-bold" data-testid="button-extra-noball">NB</Button>
          <Button disabled={!isLive} onClick={() => setExtraModal("bye")} variant="outline" className="h-10 md:h-12 lg:h-16 text-xs md:text-sm lg:text-lg font-bold" data-testid="button-extra-bye">BYE</Button>
          <Button disabled={!isLive} onClick={() => setExtraModal("legBye")} variant="outline" className="h-10 md:h-12 lg:h-16 text-xs md:text-sm lg:text-lg font-bold" data-testid="button-extra-legbye">LB</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 lg:gap-4">
          <Button disabled={!isLive} onClick={openWicketModal}
            className="h-16 md:h-20 lg:h-24 text-2xl md:text-3xl lg:text-4xl font-display bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm md:text-base"
            data-testid="button-wicket">WICKET</Button>
          <div className="grid gap-1 md:gap-2 lg:gap-4">
            <div className="grid grid-cols-2 gap-1 md:gap-2">
              <Button disabled={!isLive} onClick={undoLastBall} variant="outline"
                className="h-full flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm" data-testid="button-undo">
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Undo
              </Button>
              <Button disabled={!canUndoRedo || redoStack.length === 0} onClick={redoLastBall} variant="outline"
                className="h-full flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm" data-testid="button-redo">
                <span className="w-4 h-4 md:w-5 md:h-5 grid place-items-center">↻</span> Redo
              </Button>
            </div>
            <Button disabled={!isLive} onClick={endOver}
              className="h-full text-sm md:text-base font-bold bg-success hover:bg-success/90 text-success-foreground">End Over</Button>
          </div>
        </div>
      </div>

      {/* RIGHT: Display Control & Over History */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3 md:space-y-4 lg:space-y-6">
        <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 md:mb-4 flex items-center gap-2">
            <MonitorPlay className="w-4 h-4" /> Display Output
          </h2>
          <div className="flex flex-col gap-1 md:gap-2 lg:gap-2">
            <button data-testid="button-display-score"
              onClick={() => { setPublicView("score"); openDisplay("score"); }}
              className={`w-full flex items-center justify-between px-2 md:px-4 py-2 md:py-3 rounded-lg border text-xs md:text-sm font-semibold transition-all
                ${match.publicView === "score" ? "bg-primary border-primary text-primary-foreground" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
              <span>Score Screen</span><ExternalLink className="w-3 h-3 md:w-4 md:h-4 opacity-60" />
            </button>
            {match.currentInnings === 1 && (
              <button data-testid="button-display-target"
                onClick={() => { setPublicView("target"); openDisplay("target"); }}
                className={`w-full flex items-center justify-between px-2 md:px-4 py-2 md:py-3 rounded-lg border text-xs md:text-sm font-semibold transition-all
                  ${match.publicView === "target" ? "bg-primary border-primary text-primary-foreground" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
                <span>Target Screen</span><ExternalLink className="w-3 h-3 md:w-4 md:h-4 opacity-60" />
              </button>
            )}
            {match.currentInnings === 0 && (
              <button data-testid="button-display-break"
                onClick={() => { setPublicView("break"); updateMatch({ ...match, status: "innings_break" }); openDisplay("break"); }}
                className={`w-full flex items-center justify-between px-2 md:px-4 py-2 md:py-3 rounded-lg border text-xs md:text-sm font-semibold transition-all
                  ${match.publicView === "break" ? "bg-warning/80 border-warning text-white" : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"}`}>
                <span>Break Screen</span><ExternalLink className="w-3 h-3 md:w-4 md:h-4 opacity-60" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 md:mt-3 text-center">Opens in new window</p>
        </div>

        {match.currentInnings === 0 && (
          <div className="bg-card border border-warning/30 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6">
            <h2 className="text-xs font-bold text-warning uppercase tracking-wider mb-2 md:mb-3 flex items-center gap-2">
              <Send className="w-3 h-3 md:w-4 md:h-4" /> Break Message
            </h2>
            <textarea data-testid="input-break-message" value={breakInput} onChange={e => setBreakInput(e.target.value)}
              placeholder="Type a message for the break screen..." rows={3}
              className="w-full bg-secondary/30 border border-border rounded-lg px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-warning/60 transition-colors" />
            <div className="flex gap-1 md:gap-2 mt-2 md:mt-2">
              <Button size="sm" className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground font-bold gap-2 text-xs md:text-sm"
                onClick={() => setBreakMessage(breakInput)} data-testid="button-send-break-message">
                <Send className="w-3 h-3 md:w-4 md:h-4" /> Send
              </Button>
              {breakMessage && (
                <Button size="sm" variant="outline" className="text-muted-foreground text-xs md:text-sm"
                  onClick={() => { setBreakInput(""); setBreakMessage(""); }} data-testid="button-clear-break-message">
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 md:mb-4">This Over</h2>
          <div className="flex flex-wrap gap-1 md:gap-2">
            {innings.balls.slice(-6).map((b, i) => (
              <div key={i} className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-xs md:text-sm lg:text-lg font-bold
                ${b.isWicket ? "bg-destructive text-destructive-foreground" :
                  b.runs === 6 ? "bg-accent text-accent-foreground" :
                  b.runs === 4 ? "bg-primary text-primary-foreground" :
                  b.extra ? "bg-warning text-warning-foreground" :
                  "bg-secondary text-secondary-foreground"}`}>
                {b.isWicket
                  ? b.wicketType === 'runOut'
                    ? `RO${b.runs}`
                    : b.wicketType === 'retiredHurt'
                    ? 'RH'
                    : b.wicketType === 'caught' ? 'C' : b.wicketType === 'bowled' ? 'B' : 'W'
                  : (b.extra ? `${b.runs}${b.extra[0].toUpperCase()}` : b.runs)}
              </div>
            ))}
            {innings.balls.length === 0 && <span className="text-muted-foreground text-xs md:text-sm">No balls bowled</span>}
          </div>
        </div>
      </div>
    </div>
  );
}