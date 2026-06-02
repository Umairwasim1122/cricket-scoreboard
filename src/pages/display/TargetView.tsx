import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export default function TargetView() {
  const { matches, activeMatchId, syncState } = useCricketStore();
  const match = matches.find(m => m.id === activeMatchId);

  useEffect(() => {
    const unsubscribe = broadcastService.subscribe((incoming) => {
      const cur = useCricketStore.getState();
      const isSame = (() => {
        if (!incoming) return true;
        if (incoming.activeMatchId !== cur.activeMatchId) return false;
        if (incoming.lastEvent !== undefined && incoming.lastEvent !== cur.lastEvent) return false;
        if (incoming.breakMessage !== undefined && incoming.breakMessage !== cur.breakMessage) return false;
        if (incoming.matches && JSON.stringify(incoming.matches) !== JSON.stringify(cur.matches)) return false;
        return true;
      })();
      if (!isSame) syncState(incoming);
    });
    return () => unsubscribe();
  }, [syncState]);

  if (!match || match.currentInnings === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-xl sm:text-3xl md:text-4xl text-muted-foreground text-center px-4">Target not available yet.</div>
      </div>
    );
  }

  const innings1 = match.innings[0];
  const innings2 = match.innings[1];
  const target = innings1.totalRuns + 1;

  const validBalls2 = innings2.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
  const ballsBowled = innings2.overs * 6 + (validBalls2.length % 6);
  const totalBalls = match.totalOvers * 6;
  const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
  const wicketsLeft = 10 - innings2.wickets;

  // ── Determine match outcome ───────────────────────────────────────────────
  const isCompleted = match.status === "completed";
  const targetChased = innings2.totalRuns >= target;           // chasing team won
  const defended     = isCompleted && !targetChased;           // bowling team defended

  // Chased: won by wickets + balls left
  // Defended: won by runs
  const chasingTeam = innings2.battingTeam;
  const defendingTeam = innings1.battingTeam;

  if (isCompleted) {
    const winnerName   = targetChased ? chasingTeam : defendingTeam;
    const marginText   = targetChased
      ? `Won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}${ballsRemaining > 0 ? ` & ${ballsRemaining} ball${ballsRemaining !== 1 ? "s" : ""} to spare` : ""}`
      : `Won by ${innings1.totalRuns - innings2.totalRuns} runs`;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-[#0a0a1a] relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-accent/10 blur-[60px] sm:blur-[120px]" />
        </div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center flex flex-col items-center z-10 w-full max-w-full px-2"
        >
          <Trophy className="w-12 h-12 sm:w-24 sm:h-24 md:w-36 md:h-36 text-accent mb-2 sm:mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]" />

          <h1 className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-accent tracking-widest uppercase mb-2 sm:mb-3 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] break-words">
            {winnerName}
          </h1>

          <p className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-success mb-4 sm:mb-6 md:mb-10 tracking-wide">
            {marginText}
          </p>

          {/* Scorecard */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 md:gap-16 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl sm:rounded-[2rem] px-4 sm:px-6 md:px-8 py-4 sm:py-6 w-full max-w-xs sm:max-w-lg md:max-w-3xl">
            <div className={`text-center flex-1 w-full ${defendingTeam === winnerName ? "opacity-100" : "opacity-60"}`}>
              <p className="text-sm sm:text-xl md:text-2xl text-muted-foreground font-semibold mb-1 sm:mb-2">{innings1.battingTeam}</p>
              <p className="text-2xl sm:text-4xl md:text-5xl font-bold text-white">{innings1.totalRuns}/{innings1.wickets}</p>
            </div>

            <div className="text-lg sm:text-2xl text-muted-foreground font-bold italic">VS</div>

            <div className={`text-center flex-1 w-full ${chasingTeam === winnerName ? "opacity-100" : "opacity-60"}`}>
              <p className="text-sm sm:text-xl md:text-2xl text-muted-foreground font-semibold mb-1 sm:mb-2">{innings2.battingTeam}</p>
              <p className="text-2xl sm:text-4xl md:text-5xl font-bold text-white">{innings2.totalRuns}/{innings2.wickets}</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Live chase view ───────────────────────────────────────────────────────
  const runsNeeded = Math.max(0, target - innings2.totalRuns);
  const rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : "—";

  return (
    <div className="w-full h-full min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-[#0a0a1a]">
      <div className="absolute top-2 sm:top-6 md:top-8 left-2 sm:left-4 md:left-6 text-primary font-bold text-xs sm:text-2xl md:text-4xl tracking-widest uppercase opacity-80 max-w-[80vw] sm:max-w-[50vw] truncate">
        {match.teamA} VS {match.teamB}
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center max-w-full px-2"
      >
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-widest uppercase mb-3 sm:mb-6 md:mb-8">
          TARGET: {target}
        </h2>

        <div className="text-[2.5rem] sm:text-[4rem] md:text-[7rem] lg:text-[10rem] xl:text-[12rem] font-bold leading-tight tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          NEED <span className="text-accent">{runsNeeded}</span> RUNS
        </div>

        <div className="text-[1.8rem] sm:text-[3rem] md:text-[5rem] lg:text-[7rem] font-bold text-muted-foreground mt-2 sm:mt-4">
          IN <span className="text-white">{ballsRemaining}</span> BALLS
        </div>

        <div className="mt-3 sm:mt-6 md:mt-8 text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary/80">
          RRR: {rrr}
        </div>
      </motion.div>
    </div>
  );
}