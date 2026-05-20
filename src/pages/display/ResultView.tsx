import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export default function ResultView() {
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

  if (!match) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-xl sm:text-3xl md:text-4xl text-muted-foreground animate-pulse text-center px-4">No match data.</div>
      </div>
    );
  }

  const innings1 = match.innings[0];
  const innings2 = match.innings[1];

  // ── Compute result details ────────────────────────────────────────────────
  const chasingTeam   = innings2.battingTeam;
  const defendingTeam = innings1.battingTeam;
  const target        = innings1.totalRuns + 1;
  const targetChased  = (innings2?.totalRuns ?? 0) >= target;
  const isTie         = match.winner === "Tie";

  const winnerName = isTie ? null : match.winner;

  // Margin text: chased → wickets + balls to spare | defended → runs
  let marginText = match.result ?? "MATCH COMPLETED";
  if (!isTie && winnerName) {
    if (targetChased) {
      const wicketsLeft    = 10 - (innings2?.wickets ?? 0);
      const validBalls2    = innings2.balls.filter(b => b.extra !== "wide" && b.extra !== "noBall");
      const ballsBowled    = innings2.overs * 6 + (validBalls2.length % 6);
      const totalBalls     = match.totalOvers * 6;
      const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
      marginText = `Won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}${ballsRemaining > 0 ? ` & ${ballsRemaining} ball${ballsRemaining !== 1 ? "s" : ""} to spare` : ""}`;
    } else {
      const runMargin = innings1.totalRuns - (innings2?.totalRuns ?? 0);
      marginText = `Won by ${runMargin} run${runMargin !== 1 ? "s" : ""}`;
    }
  }

  const team1IsWinner = winnerName === innings1.battingTeam;
  const team2IsWinner = winnerName === innings2?.battingTeam;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-[#0a0a1a] relative overflow-hidden">
      {/* Ambient glow behind winner side */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[500px] md:h-[700px] rounded-full bg-accent/10 blur-[60px] sm:blur-[100px] md:blur-[140px]" />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center flex flex-col items-center z-10 w-full max-w-full px-2"
      >
        <Trophy className="w-14 h-14 sm:w-28 sm:h-28 md:w-40 md:h-40 text-accent mb-2 sm:mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]" />

        {/* Winner name */}
        {winnerName && (
          <h1 className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-accent tracking-widest uppercase mb-1 sm:mb-2 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] break-words">
            {winnerName}
          </h1>
        )}

        {/* Margin / result string */}
        <p className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-bold text-success mb-4 sm:mb-6 md:mb-10 tracking-wide">
          {isTie ? "Match Tied" : marginText}
        </p>

        {/* Scorecard */}
        <div className="flex flex-col sm:flex-row items-stretch gap-0 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl sm:rounded-[2rem] overflow-hidden w-full max-w-xs sm:max-w-lg md:max-w-4xl">
          {/* Team A */}
          <div className={`flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 transition-all
            ${team1IsWinner ? "bg-accent/10 border-b sm:border-b-0 sm:border-r border-accent/30" : "opacity-50 border-b sm:border-b-0 sm:border-r border-white/10"}`}
          >
            {team1IsWinner && (
              <span className="text-[0.5rem] sm:text-xs font-bold uppercase tracking-widest text-accent mb-1 sm:mb-3 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/20">
                Winner
              </span>
            )}
            <h3 className="text-sm sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground font-bold mb-1 sm:mb-3 text-center">{innings1.battingTeam}</h3>
            <div className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white">
              {innings1.totalRuns}<span className="text-muted-foreground text-xl sm:text-3xl md:text-4xl">/{innings1.wickets}</span>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex items-center justify-center px-3 sm:px-4 md:px-6 py-2 sm:py-0">
            <span className="text-lg sm:text-2xl md:text-3xl text-muted-foreground font-bold italic">VS</span>
          </div>

          {/* Team B */}
          <div className={`flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 transition-all
            ${team2IsWinner ? "bg-accent/10" : "opacity-50"}`}
          >
            {team2IsWinner && (
              <span className="text-[0.5rem] sm:text-xs font-bold uppercase tracking-widest text-accent mb-1 sm:mb-3 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/20">
                Winner
              </span>
            )}
            <h3 className="text-sm sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground font-bold mb-1 sm:mb-3 text-center">{innings2?.battingTeam ?? match.teamB}</h3>
            <div className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white">
              {innings2?.totalRuns ?? 0}<span className="text-muted-foreground text-xl sm:text-3xl md:text-4xl">/{innings2?.wickets ?? 0}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}