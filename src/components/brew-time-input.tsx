import { Input, Label } from "./ui/controls";

// Brew time as brewers remember it: minutes + seconds. Seconds clamp to 0–59;
// the caller owns conversion to stored total seconds.
export function MinutesSecondsInput({ minutes, seconds, onMinutes, onSeconds }: {
  minutes: string;
  seconds: string;
  onMinutes: (v: string) => void;
  onSeconds: (v: string) => void;
}) {
  function clampSeconds(raw: string): string {
    if (raw === "") return "";
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return "";
    return String(Math.min(59, Math.max(0, n)));
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="brew-min">Minutes</Label>
        <Input
          id="brew-min"
          type="number"
          inputMode="numeric"
          min={0}
          value={minutes}
          onChange={(e) => onMinutes(e.target.value === "" ? "" : String(Math.max(0, Math.floor(Number(e.target.value)) || 0)))}
        />
      </div>
      <div>
        <Label htmlFor="brew-sec">Seconds</Label>
        <Input
          id="brew-sec"
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => onSeconds(clampSeconds(e.target.value))}
        />
      </div>
    </div>
  );
}
