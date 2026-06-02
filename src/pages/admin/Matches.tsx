import { useCricketStore } from "@/store/cricketStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { MonitorPlay, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Matches() {
  const { tournaments, matches, addMatch, setActiveMatchId, activeMatchId, updateMatch, deleteMatch } = useCricketStore();
  const [, setLocation] = useLocation();

  const [tId, setTId] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState("20");
  const [inningsTimer, setInningsTimer] = useState("15");
  const [editId, setEditId] = useState<string | null>(null);
  const [editOvers, setEditOvers] = useState("20");
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editTournamentId, setEditTournamentId] = useState("");

  const selectedTournament = tournaments.find(t => t.id === tId);

  const handleCreate = () => {
    if (tId && teamA && teamB && overs && teamA !== teamB && inningsTimer) {
      const match = {
        id: Math.random().toString(36).substring(7),
        tournamentId: tId,
        teamA,
        teamB,
        totalOvers: parseInt(overs),
        inningsTimerMinutes: parseInt(inningsTimer),
        innings: [
          { battingTeam: teamA, bowlingTeam: teamB, balls: [], isComplete: false, totalRuns: 0, wickets: 0, overs: 0, byes: 0, legByes: 0 },
          { battingTeam: teamB, bowlingTeam: teamA, balls: [], isComplete: false, totalRuns: 0, wickets: 0, overs: 0, byes: 0, legByes: 0 }
        ],
        currentInnings: 0 as const,
        status: 'scheduled' as const,
        publicView: 'score' as const,
        createdAt: new Date().toISOString()
      };
      addMatch(match);
      setActiveMatchId(match.id);
      setLocation('/admin');
    }
  };

  const handleResume = (id: string) => {
    setActiveMatchId(id);
    setLocation('/admin');
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <MonitorPlay className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Matches</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-card border border-border p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold">New Match</h2>
          
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Tournament</label>
            <Select value={tId} onValueChange={setTId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTournament && (
            <>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium">Team A (Batting First)</label>
                <Select value={teamA} onValueChange={setTeamA}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTournament.teams.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium">Team B (Bowling First)</label>
                <Select value={teamB} onValueChange={setTeamB}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTournament.teams.filter(t => t !== teamA).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Total Overs</label>
            <Input 
              type="number" 
              value={overs} 
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setOvers(val);
                }
              }} 
              placeholder="20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Innings Timer (Minutes)</label>
            <Input 
              type="number" 
              value={inningsTimer} 
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setInningsTimer(val);
                }
              }} 
              className="bg-background"
              placeholder="15"
              min="1"
            />
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={handleCreate}
            disabled={!tId || !teamA || !teamB || !overs || !inningsTimer || teamA === teamB}
          >
            Start Match
          </Button>
        </div>

        <div className="md:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold">Active & Scheduled Matches</h2>
          {matches.filter(m => m.status !== 'completed').length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              No active matches. Create one to begin scoring.
            </div>
          ) : (
            matches.filter(m => m.status !== 'completed').map(m => {
              const t = tournaments.find(t => t.id === m.tournamentId);
              if (editId === m.id) {
                return (
                  <div key={m.id} className="bg-card border p-5 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Tournament</label>
                        <Select value={editTournamentId} onValueChange={setEditTournamentId}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select tournament" /></SelectTrigger>
                          <SelectContent>
                            {tournaments.map(tt => <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Team A</label>
                        <Select value={editTeamA} onValueChange={setEditTeamA}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Team A" /></SelectTrigger>
                          <SelectContent>
                            {(tournaments.find(x => x.id === editTournamentId)?.teams || []).map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Team B</label>
                        <Select value={editTeamB} onValueChange={setEditTeamB}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Team B" /></SelectTrigger>
                          <SelectContent>
                            {(tournaments.find(x => x.id === editTournamentId)?.teams || []).filter(tt => tt !== editTeamA).map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input type="number" value={editOvers} onChange={(e) => setEditOvers(e.target.value)} />
                      <div className="md:col-span-2 flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => {
                          setEditId(null);
                        }}>Cancel</Button>
                        <Button onClick={() => {
                          const updated = { ...m, tournamentId: editTournamentId, teamA: editTeamA, teamB: editTeamB, totalOvers: parseInt(editOvers), innings: [
                            { ...m.innings[0], battingTeam: editTeamA, bowlingTeam: editTeamB },
                            { ...m.innings[1], battingTeam: editTeamB, bowlingTeam: editTeamA }
                          ] };
                          updateMatch(updated);
                          setEditId(null);
                        }}>Save</Button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`bg-card border p-5 rounded-xl flex items-center justify-between ${activeMatchId === m.id ? 'border-primary shadow-[0_0_15px_rgba(0,170,255,0.15)]' : 'border-border'}`}>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mb-1">{t?.name}</div>
                    <div className="text-xl font-bold text-foreground">
                      {m.teamA} <span className="text-muted-foreground font-normal mx-2">vs</span> {m.teamB}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Status: <span className="text-primary font-medium capitalize">{m.status}</span> • {m.totalOvers} Overs
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => {
                      setEditId(m.id);
                      setEditOvers(String(m.totalOvers));
                      setEditTeamA(m.teamA);
                      setEditTeamB(m.teamB);
                      setEditTournamentId(m.tournamentId);
                    }}>Edit</Button>
                    <Button variant={activeMatchId === m.id ? "secondary" : "default"} onClick={() => handleResume(m.id)}>
                      {activeMatchId === m.id ? 'Scoring...' : 'Resume'}
                    </Button>
                    <Button variant="destructive" onClick={() => deleteMatch(m.id)}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
