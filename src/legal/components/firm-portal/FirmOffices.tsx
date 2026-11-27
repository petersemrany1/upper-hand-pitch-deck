// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmOffices.tsx). Re-run the port script to refresh.
import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, ExternalLink, Check } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { fetchFirmOffices, saveFirmOffice } from "@/legal/lib/firm-offices-api";
import { chosenOfficeId, officeAddress, type FirmOffice } from "@/legal/lib/firm-offices";
import { locationNotes, locationPoints } from "@/legal/lib/firm-location";

export function useFirmOffices(firmId: string | null) {
  return useQuery({
    queryKey: ["firm-offices", firmId],
    queryFn: () => fetchFirmOffices(firmId!),
    enabled: Boolean(firmId),
  });
}

type Props = {
  offices: FirmOffice[];
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onEdit?: ((office: FirmOffice) => void) | undefined;
  disabled?: boolean;
};

export function OfficeCards({ offices, selectedId, onSelect, onEdit, disabled }: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 @min-[36rem]:grid-cols-2">
      {offices.map((office) => {
        const selected = selectedId === office.id;
        const address = officeAddress(office);
        return (
          <article
            key={office.id}
            aria-label={`${office.name} office`}
            className={`flex min-w-0 flex-col rounded-xl border p-4 ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {office.name}
              </h3>
              {!office.is_active && <span className="text-sm text-muted-foreground">Inactive</span>}
              {onEdit && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(office)}>
                  Edit office
                </Button>
              )}
            </div>
            <p className="mt-2 break-words text-sm leading-relaxed">
              {address || "Address not added yet."}
            </p>
            {address && (
              <a
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open map <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
            <OfficePoints label="Parking" text={office.parking_info} />
            <OfficePoints label="Landmarks & getting here" text={office.nearby_landmarks} />
            {onSelect && office.is_active && (
              <div className="mt-auto pt-4">
                <Button
                  className="w-full whitespace-normal"
                  type="button"
                  variant={selected ? "default" : "outline"}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onSelect(office.id)}
                >
                  {selected && <Check className="mr-1 size-4" aria-hidden="true" />}
                  {selected ? `${office.name} selected` : `Choose ${office.name}`}
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function OfficePoints({ label, text }: { label: string; text: string | null }) {
  const points = locationPoints(text);
  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold">{label}</h4>
      {points.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed">
          {points.map((point, i) => (
            <li className="break-words" key={i}>
              {point}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Details awaiting confirmation.</p>
      )}
    </div>
  );
}

export function FirmOffices({
  firmId,
  canEdit = false,
  selectedId,
  onSelect,
  disabled = false,
}: {
  firmId: string;
  canEdit?: boolean;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  disabled?: boolean;
}) {
  const query = useFirmOffices(firmId);
  const client = useQueryClient();
  const [draft, setDraft] = useState<(Omit<FirmOffice, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const offices = (query.data ?? []).filter((office) => canEdit || office.is_active);
  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      await saveFirmOffice({
        ...draft,
        parking_info: locationNotes(draft.parking_info ?? ""),
        nearby_landmarks: locationNotes(draft.nearby_landmarks ?? ""),
      });
      await client.invalidateQueries({ queryKey: ["firm-offices", firmId] });
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save office");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="@container space-y-3" aria-label="Office locations">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Office locations</h2>
        {canEdit && !draft && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setError("");
              setDraft({
                firm_id: firmId,
                name: "",
                address: "",
                city: "",
                state: "",
                parking_info: "",
                nearby_landmarks: "",
                is_active: true,
              });
            }}
          >
            Add office
          </Button>
        )}
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm">
          Loading offices…
        </p>
      ) : query.isError ? (
        <div role="alert" className="text-sm">
          Could not load offices.{" "}
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            Retry offices
          </Button>
        </div>
      ) : offices.length ? (
        <OfficeCards
          offices={offices}
          selectedId={onSelect ? chosenOfficeId(offices, selectedId) : selectedId}
          onSelect={onSelect}
          disabled={disabled}
          onEdit={
            canEdit
              ? (office) => {
                  setError("");
                  setDraft(office);
                }
              : undefined
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">No offices added yet.</p>
      )}
      {draft && (
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h3 className="text-base font-semibold">
            {draft.id ? `Edit ${draft.name}` : "Add office"}
          </h3>
          {(
            [
              ["name", "Office name"],
              ["address", "Street address (including level or suite)"],
              ["city", "City / suburb"],
              ["state", "State / postcode"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              htmlFor={`${id}-${key}`}
              className="block space-y-1 text-sm font-medium"
            >
              {label}
              <Input
                id={`${id}-${key}`}
                value={draft[key] ?? ""}
                required={key === "name" || key === "address"}
                disabled={saving}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              />
            </label>
          ))}
          {(
            [
              ["parking_info", "Parking"],
              ["nearby_landmarks", "Landmarks & getting here"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              htmlFor={`${id}-${key}`}
              className="block space-y-1 text-sm font-medium"
            >
              {label}
              <Textarea
                id={`${id}-${key}`}
                value={draft[key] ?? ""}
                rows={3}
                disabled={saving}
                placeholder="One short point per line"
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              disabled={saving}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />{" "}
            Available for new bookings
          </label>
          <p className="text-sm text-muted-foreground">
            These details are copied to new bookings. Existing bookings keep their saved directions.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save office"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
