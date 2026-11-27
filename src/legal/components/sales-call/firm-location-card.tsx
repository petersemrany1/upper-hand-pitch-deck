// Ported from the Legal app (family-law-floater/src/components/sales-call/firm-location-card.tsx). Re-run the port script to refresh.
import { useId, useState } from "react";
import { ExternalLink, MapPin, Pencil } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { Label } from "@/legal/components/ui/label";
import { Textarea } from "@/legal/components/ui/textarea";
import { locationNotes, locationPoints, type FirmLocationNotes } from "@/legal/lib/firm-location";
import type { Firm } from "@/legal/lib/partner-firms";

type Props = {
  firm: Firm;
  onSave?: ((firmId: string, notes: FirmLocationNotes) => Promise<void>) | undefined;
};

export function FirmLocationCard(props: Props) {
  // Switching firms must never carry an editor or unsaved points to another firm.
  return <LocationDetails key={props.firm.id} {...props} />;
}

function Points({ label, text }: { label: string; text: string | null }) {
  const points = locationPoints(text);
  return (
    <div>
      <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h5>
      {points.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug">
          {points.map((point, index) => (
            <li key={index} className="break-words">
              {point}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">No details added yet.</p>
      )}
    </div>
  );
}

function LocationDetails({ firm, onSave }: Props) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [nearby, setNearby] = useState("");
  const [parking, setParking] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const address = [firm.address, firm.city, firm.state].filter((part) => part?.trim()).join(", ");
  const mapQuery = [firm.firm_name, address].filter(Boolean).join(", ");

  async function save() {
    if (!onSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(firm.id, {
        nearby_landmarks: locationNotes(nearby),
        parking_info: locationNotes(parking),
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save location notes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="mt-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${id}-heading`} className="flex items-center gap-1.5 text-[13px] font-semibold">
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Location at a glance
        </h4>
        {onSave && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setNearby(firm.nearby_landmarks ?? "");
              setParking(firm.parking_info ?? "");
              setError(null);
              setEditing(true);
            }}
          >
            <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />
            {locationPoints(firm.nearby_landmarks).length ||
            locationPoints(firm.parking_info).length
              ? "Edit points"
              : "Add points"}
          </Button>
        ) : null}
      </div>

      {address ? (
        <p className="mt-2 break-words text-[13px] leading-snug">{address}</p>
      ) : (
        <p className="mt-2 text-[12px] text-muted-foreground">Address not added yet.</p>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View map & surroundings <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>

      {editing && onSave ? (
        <div className="mt-3 space-y-3 border-t pt-3">
          <p id={`${id}-help`} className="text-[12px] text-muted-foreground">
            One short point per line. Saved points are visible to the sales team for this firm.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-nearby`} className="text-xs">
              Nearby landmarks & getting here
            </Label>
            <Textarea
              id={`${id}-nearby`}
              aria-describedby={`${id}-help`}
              value={nearby}
              onChange={(event) => setNearby(event.target.value)}
              placeholder={
                "Near [landmark name]\nEntrance beside [shop name]\nA short walk from [station name]"
              }
              rows={4}
              className="text-[13px]"
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-parking`} className="text-xs">
              Parking
            </Label>
            <Textarea
              id={`${id}-parking`}
              aria-describedby={`${id}-help`}
              value={parking}
              onChange={(event) => setParking(event.target.value)}
              placeholder={"Parking in the rear lane\nEnter via [street name]"}
              rows={3}
              className="text-[13px]"
              disabled={saving}
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save points"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3 border-t pt-3">
          <Points label="Nearby landmarks & getting here" text={firm.nearby_landmarks} />
          <Points label="Parking" text={firm.parking_info} />
        </div>
      )}
    </section>
  );
}
