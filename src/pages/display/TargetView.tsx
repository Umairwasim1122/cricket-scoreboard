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
        <div className="text-4xl text-muted-foreground">Target not available yet.</div>
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
      <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0a0a1a] relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center flex flex-col items-center z-10"
        >
          <Trophy className="w-24 h-24 sm:w-36 sm:h-36 text-accent mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]" />

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-accent tracking-widest uppercase mb-3 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
            {winnerName}
          </h1>

          <p className="text-2xl sm:text-4xl md:text-5xl font-bold text-success mb-10 tracking-wide">
            {marginText}
          </p>

          {/* Scorecard */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-16 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[2rem] px-8 py-6 w-full max-w-3xl">
            <div className={`text-center flex-1 ${defendingTeam === winnerName ? "opacity-100" : "opacity-60"}`}>
              <p className="text-xl sm:text-2xl text-muted-foreground font-semibold mb-2">{innings1.battingTeam}</p>
              <p className="text-4xl sm:text-5xl font-bold text-white">{innings1.totalRuns}/{innings1.wickets}</p>
            </div>

            <div className="text-2xl text-muted-foreground font-bold italic">VS</div>

            <div className={`text-center flex-1 ${chasingTeam === winnerName ? "opacity-100" : "opacity-60"}`}>
              <p className="text-xl sm:text-2xl text-muted-foreground font-semibold mb-2">{innings2.battingTeam}</p>
              <p className="text-4xl sm:text-5xl font-bold text-white">{innings2.totalRuns}/{innings2.wickets}</p>
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
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0a0a1a]">
      <div className="absolute top-8 left-6 text-primary font-bold text-2xl sm:text-4xl tracking-widest uppercase opacity-80">
        {match.teamA} VS {match.teamB}
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h2 className="text-4xl sm:text-6xl text-primary font-bold tracking-widest uppercase mb-6 sm:mb-8">
          TARGET: {target}
        </h2>

        <div className="text-[5rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-bold leading-tight tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          NEED <span className="text-accent">{runsNeeded}</span> RUNS
        </div>

        <div className="text-[3.5rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7rem] font-bold text-muted-foreground mt-4">
          IN <span className="text-white">{ballsRemaining}</span> BALLS
        </div>

        <div className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl font-bold text-primary/80">
          RRR: {rrr}
        </div>
      </motion.div>
    </div>
  );
}