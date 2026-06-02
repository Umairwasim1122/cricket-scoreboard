import { useEffect, useState } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  getThemeMode,
  getMobileViewEnabled,
  setThemeMode,
  setMobileViewEnabled,
} from "@/lib/settings";
import jsPDF from "jspdf";

type ThemeMode = 'dark' | 'light';

export default function Settings() {
  const { activeMatchId, matches } = useCricketStore();
  const match = matches.find((m) => m.id === activeMatchId);

  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mobileView, setMobileView] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setTheme(getThemeMode());
    setMobileView(getMobileViewEnabled());
  }, []);

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value);
    setThemeMode(value);
    setStatusMessage(`Theme updated to ${value}.`);
  };

  const handleMobileViewToggle = (value: boolean) => {
    setMobileView(value);
    setMobileViewEnabled(value);
    setStatusMessage(value ? 'Mobile display view enabled.' : 'Desktop display view enabled.');
  };

  const saveMatchToStorage = () => {
    if (!match) return;
    localStorage.setItem(`cricket-scoreboard-saved-match-${match.id}`, JSON.stringify(match));
    setStatusMessage('Current match saved to storage.');
  };

  const buildSummaryLines = () => {
    if (!match) return [];
    const innings1 = match.innings[0];
    const innings2 = match.innings[1];
    return [
      `Match: ${match.teamA} vs ${match.teamB}`,
      `Status: ${match.status}`,
      `Display View: ${match.publicView}`,
      `Overs per innings: ${match.totalOvers}`,
      `First Innings: ${innings1.battingTeam} ${innings1.totalRuns}/${innings1.wickets} (${innings1.overs} overs)`,
      `Second Innings: ${innings2.battingTeam} ${innings2.totalRuns}/${innings2.wickets} (${innings2.overs} overs)`,
      match.result ? `Result: ${match.result}` : undefined,
      match.completedAt ? `Completed At: ${new Date(match.completedAt).toLocaleString()}` : undefined,
    ].filter(Boolean) as string[];
  };

  const downloadMatchPdf = () => {
    if (!match) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(22);
    doc.text('Cricket Match Result', 40, 50);
    doc.setFontSize(12);

    const lines = buildSummaryLines();
    let y = 90;
    lines.forEach((line) => {
      doc.text(line, 40, y);
      y += 18;
    });

    const filename = `match-result-${match.id}.pdf`;
    doc.save(filename);
    setStatusMessage('PDF downloaded successfully.');
  };

  const shareMatchPdf = async () => {
    if (!match) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(22);
    doc.text('Cricket Match Result', 40, 50);
    doc.setFontSize(12);

    const lines = buildSummaryLines();
    let y = 90;
    lines.forEach((line) => {
      doc.text(line, 40, y);
      y += 18;
    });

    const filename = `match-result-${match.id}.pdf`;
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Cricket Match Result',
          text: `Match result for ${match.teamA} vs ${match.teamB}`,
          files: [file],
        });
        setStatusMessage('PDF shared successfully.');
        return;
      }
    } catch {
      // fallback to download below
    }

    doc.save(filename);
    setStatusMessage('Sharing unavailable; PDF downloaded instead.');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage storage, export and display preferences for the scoreboard.</p>
      </header>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Match storage</h2>
            <p className="text-sm text-muted-foreground">Save the active match snapshot to browser storage for later recovery.</p>
          </div>
          <Button disabled={!match} onClick={saveMatchToStorage}>
            Save current match
          </Button>
        </div>
        <div className="rounded-xl border border-dashed border-border p-4 bg-background/80">
          {match ? (
            <p className="text-sm">
              Active match: <span className="font-semibold">{match.teamA} vs {match.teamB}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Select an active match before saving.</p>
          )}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold">PDF export</h2>
          <p className="text-sm text-muted-foreground">Download or share a PDF summary of the current match.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={!match} onClick={downloadMatchPdf}>
            Download PDF
          </Button>
          <Button variant="outline" disabled={!match} onClick={shareMatchPdf}>
            Share PDF
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Display preferences</h2>
          <p className="text-sm text-muted-foreground">Choose whether display screens open in mobile or desktop view.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="mobile-view" className="mb-1 block text-sm font-medium">Show mobile view</Label>
            <p className="text-sm text-muted-foreground">When enabled, display windows open in a handheld-sized popup.</p>
          </div>
          <Switch id="mobile-view" checked={mobileView} onCheckedChange={(value) => handleMobileViewToggle(value as boolean)} />
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Theme</h2>
          <p className="text-sm text-muted-foreground">Switch between light and dark appearance.</p>
        </div>
        <RadioGroup value={theme} onValueChange={(value) => handleThemeChange(value as ThemeMode)} className="grid gap-2">
          <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:border-primary">
            <RadioGroupItem value="light" />
            <span>Light theme</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:border-primary">
            <RadioGroupItem value="dark" />
            <span>Dark theme</span>
          </label>
        </RadioGroup>
      </section>

      {statusMessage ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success">{statusMessage}</div>
      ) : null}

      <Separator />

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Quick reference</h2>
        <p className="text-sm text-muted-foreground">Saved storage keys:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><span className="font-medium">cricket-scoreboard-saved-match-[matchId]</span></li>
          <li><span className="font-medium">cricket-scoreboard-theme</span></li>
          <li><span className="font-medium">cricket-scoreboard-mobile-view</span></li>
        </ul>
      </section>
    </div>
  );
}
