import { useCricketStore } from "@/store/cricketStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trophy, Trash2 } from "lucide-react";

export default function Tournaments() {
  const { tournaments, addTournament, updateTournament, deleteTournament } = useCricketStore();
  const [name, setName] = useState("");
  const [teamInput, setTeamInput] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeams, setEditTeams] = useState<string[]>([]);
  const [editTeamInput, setEditTeamInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAddTeam = () => {
    if (teamInput.trim() && !teams.includes(teamInput.trim())) {
      setTeams([...teams, teamInput.trim()]);
      setTeamInput("");
    }
  };

  const handleCreate = () => {
    if (name.trim() && teams.length >= 2) {
      addTournament({
        id: Math.random().toString(36).substring(7),
        name: name.trim(),
        teams,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      setName("");
      setTeams([]);
    }
  };

  const handleDelete = (id: string) => {
    deleteTournament(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Tournaments</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-card border border-border p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold">New Tournament</h2>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Tournament Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Cup 2024"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Add Teams</label>
            <div className="flex gap-2">
              <Input
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                placeholder="Team Name"
                className="bg-background"
              />
              <Button onClick={handleAddTeam} variant="secondary">Add</Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {teams.map(t => (
                <span key={t} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleCreate}
            disabled={!name.trim() || teams.length < 2}
          >
            Create Tournament
          </Button>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tournaments.map(t => (
            <div key={t.id} className="bg-card border border-border p-6 rounded-xl flex flex-col">
              {editingId === t.id ? (
                <>
                  <input className="mb-2 p-2 rounded border" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="flex gap-2 mb-2">
                    <input
                      className="p-2 rounded border flex-1"
                      value={editTeamInput}
                      onChange={(e) => setEditTeamInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (editTeamInput.trim() && !editTeams.includes(editTeamInput.trim()) ? setEditTeams([...editTeams, editTeamInput.trim()]) : null, setEditTeamInput(''))}
                    />
                    <Button variant="secondary" onClick={() => { if (editTeamInput.trim() && !editTeams.includes(editTeamInput.trim())) { setEditTeams([...editTeams, editTeamInput.trim()]); setEditTeamInput(''); } }}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {editTeams.map(team => (
                      <span key={team} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                        {team} <button onClick={() => setEditTeams(editTeams.filter(x => x !== team))} className="ml-2 text-xs">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button onClick={() => {
                      updateTournament({ ...t, name: editName.trim(), teams: editTeams });
                      setEditingId(null);
                    }}>Save</Button>
                  </div>
                </>
              ) : confirmDeleteId === t.id ? (
                // ── Confirm delete prompt ──
                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                  <Trash2 className="w-8 h-8 text-destructive" />
                  <p className="text-sm font-medium">
                    Delete <span className="text-primary font-bold">{t.name}</span>?
                    <br />
                    <span className="text-muted-foreground text-xs">This action cannot be undone.</span>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleDelete(t.id)}>Delete</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-primary mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">Started {new Date(t.startDate).toLocaleDateString()}</p>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Teams ({t.teams.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {t.teams.map(team => (
                        <span key={team} className="text-xs bg-secondary px-2 py-1 rounded">
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" onClick={() => { setEditingId(t.id); setEditName(t.name); setEditTeams(t.teams); }}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => setConfirmDeleteId(t.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}