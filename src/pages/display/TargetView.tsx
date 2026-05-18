import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";

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
  const runsNeeded = Math.max(0, target - innings2.totalRuns);

  const validBalls2 = innings2.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
  const ballsBowled = innings2.overs * 6 + (validBalls2.length % 6);
  const totalBalls = match.totalOvers * 6;
  const ballsRemaining = Math.max(0, totalBalls - ballsBowled);

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
