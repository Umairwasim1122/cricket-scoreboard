import { useCricketStore } from "@/store/cricketStore";
import { History as HistoryIcon } from "lucide-react";

export default function History() {
  const { history } = useCricketStore();

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Match History</h1>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-xl text-muted-foreground">
          <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No completed matches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map(h => (
            <div key={h.id} className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{h.tournamentName}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.completedAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-2xl font-display font-bold">
                <div className={h.winner === h.teamA ? "text-foreground" : "text-muted-foreground"}>
                  {h.teamA} <span className="text-sm ml-2 bg-secondary px-2 py-1 rounded">{h.finalScoreA}</span>
                </div>
                <div className="text-sm text-muted-foreground font-sans px-4">vs</div>
                <div className={h.winner === h.teamB ? "text-foreground" : "text-muted-foreground"}>
                  <span className="text-sm mr-2 bg-secondary px-2 py-1 rounded">{h.finalScoreB}</span> {h.teamB}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-success font-medium">{h.result}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
