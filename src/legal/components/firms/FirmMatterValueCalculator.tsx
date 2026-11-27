// Ported from the Legal app (family-law-floater/src/components/firms/FirmMatterValueCalculator.tsx). Re-run the port script to refresh.
import { useId, useState, type ChangeEvent } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/legal/components/ui/dialog";
import {
  calculateMatterValue,
  formatMatterFeeInput,
  matterMoney,
  parseMatterFee,
  type MatterValueInputs,
} from "@/legal/lib/firm-matter-value";

function updateFeeInput(event: ChangeEvent<HTMLInputElement>, setValue: (value: string) => void) {
  const input = event.currentTarget;
  const raw = input.value;
  const formatted = formatMatterFeeInput(raw);
  if (formatted !== raw) {
    const position = (offset: number) => {
      let remaining = raw.slice(0, offset).replace(/,/g, "").length;
      let index = 0;
      while (index < formatted.length && remaining > 0) {
        if (formatted[index] !== ",") remaining--;
        index++;
      }
      if (
        (event.nativeEvent as InputEvent).inputType === "deleteContentForward" &&
        formatted[index] === ","
      )
        index++;
      return index;
    };
    const start = position(input.selectionStart ?? raw.length);
    const end = position(input.selectionEnd ?? raw.length);
    const direction = input.selectionDirection ?? "none";
    // Apply both together so adding commas doesn't move the cursor to the end.
    input.value = formatted;
    input.setSelectionRange(start, end, direction);
  }
  setValue(formatted);
}

export function FirmMatterValueCalculator({
  saved,
  onApply,
}: {
  saved: MatterValueInputs | null;
  onApply: (inputs: MatterValueInputs) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nonCourt, setNonCourt] = useState("");
  const [court, setCourt] = useState("");
  const [count, setCount] = useState("");
  const [error, setError] = useState("");
  const id = useId();
  const nonCourtFee = parseMatterFee(nonCourt);
  const courtFee = parseMatterFee(court);
  const courtMatters = /^\d+$/.test(count.trim()) ? Number(count) : NaN;
  const inputs =
    nonCourtFee !== null && courtFee !== null ? { nonCourtFee, courtFee, courtMatters } : null;
  const result = inputs ? calculateMatterValue(inputs) : null;
  const savedResult = saved ? calculateMatterValue(saved) : null;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setNonCourt(saved ? formatMatterFeeInput(String(saved.nonCourtFee)) : "");
          setCourt(saved ? formatMatterFeeInput(String(saved.courtFee)) : "");
          setCount(saved ? String(saved.courtMatters) : "");
          setError("");
        }
        setOpen(value);
      }}
    >
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Calculator className="mr-2 size-4" />
            Calculate average matter value
          </Button>
        </DialogTrigger>
        {savedResult && (
          <span className="text-sm font-medium text-indigo-700">
            {matterMoney(savedResult.average)} per matter · added to notes
          </span>
        )}
      </div>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Average matter value</DialogTitle>
          <DialogDescription className="sr-only">
            Enter both fees and how many of 10 matters go to court to calculate the average.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!inputs || !result) return;
            try {
              onApply(inputs);
              setOpen(false);
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Couldn’t add the calculation to notes.",
              );
            }
          }}
        >
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor={`${id}-non-court`} className="space-y-2 text-sm font-medium">
                <span className="block">Negotiation / mediation ($)</span>
                <input
                  id={`${id}-non-court`}
                  inputMode="decimal"
                  value={nonCourt}
                  placeholder="e.g. 25k"
                  className="h-11 w-full rounded-md border bg-background px-3 font-normal focus-visible:outline-primary"
                  onChange={(event) => updateFeeInput(event, setNonCourt)}
                  aria-invalid={!!nonCourt && nonCourtFee === null}
                  aria-describedby={`${id}-fees`}
                />
              </label>
              <label htmlFor={`${id}-court`} className="space-y-2 text-sm font-medium">
                <span className="block">Court — total fee ($)</span>
                <input
                  id={`${id}-court`}
                  inputMode="decimal"
                  value={court}
                  placeholder="e.g. 100k"
                  className="h-11 w-full rounded-md border bg-background px-3 font-normal focus-visible:outline-primary"
                  onChange={(event) => updateFeeInput(event, setCourt)}
                  aria-invalid={!!court && courtFee === null}
                  aria-describedby={`${id}-fees`}
                />
              </label>
            </div>
            <p id={`${id}-fees`} className="text-xs text-muted-foreground">
              Court includes earlier work. Use the same GST basis for both fees.
            </p>
            {(!!nonCourt && nonCourtFee === null) || (!!court && courtFee === null) ? (
              <p className="text-sm text-destructive">Enter a valid fee, such as 25,000 or 25k.</p>
            ) : null}
            <div>
              <label htmlFor={`${id}-count`} className="block text-sm font-medium">
                How many out of 10 go to court?
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  id={`${id}-count`}
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  inputMode="numeric"
                  placeholder="0–10"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="h-11 w-24 rounded-md border bg-background px-3"
                  aria-describedby={`${id}-split`}
                />
                <p id={`${id}-split`} className="text-sm text-muted-foreground">
                  {Number.isInteger(courtMatters) && courtMatters >= 0 && courtMatters <= 10
                    ? `${10 - courtMatters} without court`
                    : "Enter a whole number from 0 to 10."}
                </p>
              </div>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {result && inputs ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Average per matter
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {matterMoney(result.average)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600 tabular-nums">
                    ({result.nonCourtMatters} × {matterMoney(inputs.nonCourtFee)} +{" "}
                    {inputs.courtMatters} × {matterMoney(inputs.courtFee)}) ÷ 10
                  </p>
                  <p className="mt-3 text-sm leading-5">
                    “That’s about {matterMoney(result.average)} per matter on average. Sound right?”
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Enter the three figures to see the average.
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!result}>
              Save to notes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
