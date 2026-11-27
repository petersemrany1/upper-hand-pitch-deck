// Ported from the Legal app (family-law-floater/src/components/sales-call/client-assets.tsx). Re-run the port script to refresh.
import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Home, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { FloatingAssetWindow } from "./floating-asset-window";
import "./client-assets.css";
import { Button } from "@/legal/components/ui/button";
import { useClientAssetDraft } from "@/legal/hooks/use-client-assets";
import { fetchClientAssets } from "@/legal/lib/client-assets-api";
import { assetAmountCaret, groupAssetAmountInput } from "@/legal/lib/asset-amount-input";
import {
  ASSET_CATEGORIES,
  MAX_ASSET_ROWS,
  assetMoney,
  assetRowDescription,
  calculateAssetRow,
  calculateClientAssets,
  changeAssetMode,
  createAssetRow,
  formatAssetAmount,
  parseAssetAmount,
  type AssetCalculation,
  type AssetCategory,
  type AssetRow,
  type SavedAssetCalculation,
} from "@/legal/lib/client-assets";
import type { AssetDraftSnapshot } from "@/legal/lib/client-assets-draft";

const ADD_LABELS = {
  property: "Property",
  super: "Super",
  vehicle: "Vehicle",
  business: "Business",
  savings: "Savings & investments",
  personal_savings: "Personal savings",
  other_investments: "Other savings & investments",
  other: "Other asset",
  debt: "Debt",
};
function Amount({
  label,
  value,
  onChange,
  signed = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  signed?: boolean;
}) {
  const id = useId();
  const composing = useRef(false);
  const invalid = parseAssetAmount(value, signed) === null;
  function updateAmount(input: HTMLInputElement) {
    const raw = input.value;
    if (composing.current) {
      onChange(raw);
      return;
    }
    const formatted = groupAssetAmountInput(raw);
    const start = assetAmountCaret(raw, formatted, input.selectionStart ?? raw.length);
    const end = assetAmountCaret(raw, formatted, input.selectionEnd ?? raw.length);
    const direction = input.selectionDirection ?? undefined;
    input.value = formatted;
    input.setSelectionRange(start, end, direction);
    onChange(formatted);
  }
  return (
    <label className="asset-amount">
      <span className="sr-only">{label}</span>
      <span className="asset-currency" aria-hidden="true">
        $
      </span>
      <input
        value={composing.current ? value : groupAssetAmountInput(value)}
        inputMode="text"
        maxLength={32}
        placeholder="—"
        aria-invalid={invalid}
        aria-describedby={invalid ? id : undefined}
        onChange={(event) => updateAmount(event.currentTarget)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          updateAmount(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (composing.current || event.altKey || event.ctrlKey || event.metaKey) return;
          const input = event.currentTarget;
          const caret = input.selectionStart;
          if (caret === null || caret !== input.selectionEnd) return;
          // Separators are visual: delete the adjacent digit with a single key press.
          if (event.key === "Backspace" && input.value[caret - 1] === ",") {
            input.setSelectionRange(caret - 1, caret - 1);
          } else if (event.key === "Delete" && input.value[caret] === ",") {
            input.setSelectionRange(caret + 1, caret + 1);
          }
        }}
        onBlur={() => {
          const formatted = formatAssetAmount(value, signed);
          if (formatted !== value) onChange(formatted);
        }}
      />
      {invalid && (
        <span id={id} className="asset-input-error">
          Use a number, e.g. 850k
        </span>
      )}
    </label>
  );
}

export function AssetTotals({ calculation }: { calculation: AssetCalculation }) {
  const total = calculateClientAssets(calculation);
  const tone = total.invalid
    ? "text-muted-foreground"
    : total.targetReached
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  return (
    <div aria-label="Asset totals">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Total net assets</p>
          <p className="mt-1 text-xs text-muted-foreground">Including super · AUD</p>
        </div>
        <div className="text-right">
          <output
            aria-label="Total net assets"
            className={`text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${tone}`}
          >
            {total.invalid ? "—" : assetMoney(total.net)}
          </output>
          <p className={`mt-1 text-xs font-medium ${tone}`}>
            {total.invalid
              ? "Check highlighted amounts"
              : total.targetReached
                ? "$750k reached"
                : "Below $750k"}
          </p>
        </div>
      </div>
      {total.incomplete > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {total.incomplete} incomplete {total.incomplete === 1 ? "entry" : "entries"} excluded from
          total.
        </p>
      )}
    </div>
  );
}

type EditorProps = AssetDraftSnapshot & {
  setCalculation: (value: AssetCalculation) => void;
  flush: () => Promise<void>;
  onReviewConflict: () => void;
};
const SIMPLE_ASSETS = [
  { key: "super", label: "Super" },
  { key: "personal_savings", label: "Personal savings" },
  { key: "other_investments", label: "Other savings & investments" },
  { key: "business", label: "Business" },
  { key: "vehicle", label: "Cars / caravans · equity" },
  { key: "other", label: "Other assets" },
  { key: "debt", label: "Other debts" },
] as const;
const entryAmount = (row: AssetRow) =>
  row.mode === "equity"
    ? row.equity
    : row.mode === "amount"
      ? row.category === "debt"
        ? row.debt
        : row.value
      : calculateAssetRow(row).net === null
        ? ""
        : formatAssetAmount(String(calculateAssetRow(row).net! / 100), true);

function EquityFields({
  row,
  name,
  patch,
  labelField = true,
}: {
  row: AssetRow;
  name: string;
  patch: (changes: Partial<AssetRow>) => void;
  labelField?: boolean;
}) {
  const net = calculateAssetRow(row).net;
  return (
    <>
      <div className="asset-property-identity">
        {labelField && (
          <input
            className="asset-suburb"
            value={row.label}
            maxLength={120}
            placeholder={row.category === "property" ? "Suburb (optional)" : "Vehicle (optional)"}
            aria-label={row.category === "property" ? "Property suburb" : "Vehicle name"}
            onChange={(event) => patch({ label: event.target.value })}
          />
        )}
        <div className="asset-entry-mode" role="group" aria-label={`${name} entry method`}>
          {(
            [
              ["valuation", "Value & owing"],
              ["equity", "Equity only"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={row.mode === mode}
              onClick={() => patch(changeAssetMode(row, mode))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="asset-property-values">
        {row.mode === "valuation" ? (
          <>
            <div>
              <span className="asset-field-label">Value</span>
              <Amount
                label={`${name} value`}
                value={row.value}
                onChange={(value) => patch({ value })}
              />
            </div>
            <div>
              <span className="asset-field-label">Owing</span>
              <Amount
                label={`${name} owing`}
                value={row.debt}
                onChange={(debt) => patch({ debt })}
              />
            </div>
          </>
        ) : (
          <div className="asset-direct-equity">
            <span className="asset-field-label">Equity</span>
            <Amount
              label={`${name} equity`}
              value={row.equity}
              signed
              onChange={(equity) => patch({ equity })}
            />
          </div>
        )}
        <div className="asset-property-net">
          <span className="asset-field-label">Net equity</span>
          <output
            aria-label={`${name} net equity`}
            className={net !== null && net < 0 ? "text-red-600" : ""}
          >
            {net === null ? "—" : assetMoney(net)}
          </output>
        </div>
      </div>
    </>
  );
}

export function ClientAssetEditor({
  calculation,
  status,
  protectedDraft,
  updatedAt,
  setCalculation,
  flush,
  onReviewConflict,
}: EditorProps) {
  const [emptyProperty] = useState(() => createAssetRow("property"));
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<AssetCategory | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ row: AssetRow; index: number } | null>(null);
  const propertyEditor = useRef<HTMLDivElement>(null);
  const [focusProperty, setFocusProperty] = useState(false);
  useEffect(() => {
    if (focusProperty) {
      propertyEditor.current
        ?.querySelector<HTMLInputElement>(".asset-suburb")
        ?.focus({ preventScroll: true });
      setFocusProperty(false);
    }
  }, [focusProperty]);
  const properties = calculation.rows.filter((row) => row.category === "property");
  const property =
    properties.find((row) => row.id === selectedProperty) ?? properties[0] ?? emptyProperty;
  const canAdd = calculation.rows.length < MAX_ASSET_ROWS;
  const upsert = (row: AssetRow, changes: Partial<AssetRow>) => {
    const exists = calculation.rows.some((item) => item.id === row.id);
    if (!exists && !canAdd) return;
    const next = { ...row, ...changes };
    setCalculation({
      ...calculation,
      rows: exists
        ? calculation.rows.map((item) => (item.id === row.id ? next : item))
        : [...calculation.rows, next],
    });
  };
  const remove = (row: AssetRow) => {
    const index = calculation.rows.findIndex((item) => item.id === row.id);
    if (index < 0) return;
    setRemoved({ row, index });
    setCalculation({ ...calculation, rows: calculation.rows.filter((item) => item.id !== row.id) });
  };
  const addProperty = () => {
    const blank = properties.find((row) => !row.label && !row.value && !row.debt && !row.equity);
    if (blank || !properties.length) {
      setSelectedProperty(blank?.id ?? null);
      setFocusProperty(true);
      return;
    }
    if (!canAdd) return;
    const row = createAssetRow("property");
    setCalculation({ ...calculation, rows: [...calculation.rows, row] });
    setSelectedProperty(row.id);
    setFocusProperty(true);
  };
  const total = calculateClientAssets(calculation);
  const tone = total.invalid
    ? "text-muted-foreground"
    : total.targetReached
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const statusText =
    status === "saved"
      ? updatedAt
        ? "Saved to client"
        : "Saves automatically"
      : status === "saving"
        ? "Saving…"
        : status === "invalid"
          ? "Check amounts · not saved"
          : status === "conflict"
            ? "Newer version on file"
            : "Not saved · retry";
  const hasCombinedSavings = calculation.rows.some((row) => row.category === "savings");
  const amountFields = SIMPLE_ASSETS.map((field) =>
    field.key === "other_investments" && hasCombinedSavings
      ? { key: "savings" as const, label: "Savings & investments (incl. personal)" }
      : field,
  );
  const detailRows = calculation.rows.filter((row) => row.category === detailCategory);
  const detail = detailRows.find((row) => row.id === detailId) ?? detailRows[0];
  return (
    <>
      <div className="asset-single-content">
        <section className="asset-property-section" aria-label="Properties" ref={propertyEditor}>
          <div className="asset-section-heading">
            <div className="asset-property-picker">
              <Home size={15} />
              {properties.length > 1 ? (
                <select
                  aria-label="Select property"
                  value={property.id}
                  onChange={(event) => setSelectedProperty(event.target.value)}
                >
                  {properties.map((row, index) => (
                    <option key={row.id} value={row.id}>
                      {row.label || `Property ${index + 1}`} ·{" "}
                      {calculateAssetRow(row).net === null
                        ? "Incomplete"
                        : assetMoney(calculateAssetRow(row).net!)}
                    </option>
                  ))}
                </select>
              ) : (
                <h3>Property</h3>
              )}
              {properties.length > 1 && (
                <span className="asset-property-count">
                  {properties.findIndex((row) => row.id === property.id) + 1} of {properties.length}
                </span>
              )}
            </div>
            <button
              type="button"
              className="asset-add-property"
              disabled={!canAdd}
              onClick={addProperty}
            >
              <Plus size={14} />
              Add another property
            </button>
            {properties.length > 0 && (
              <button
                type="button"
                className="asset-remove"
                aria-label="Remove this property"
                title="Remove this property"
                onClick={() => remove(property)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <EquityFields
            row={property}
            name="Property"
            patch={(changes) => upsert(property, changes)}
          />
        </section>
        <section className="asset-other-section" aria-label="Other assets and debts">
          {detailCategory && detail ? (
            <div className="asset-existing-breakdown">
              <div className="asset-section-heading">
                <h3>{ADD_LABELS[detailCategory]}</h3>
                <button
                  type="button"
                  className="asset-back"
                  onClick={() => {
                    setDetailCategory(null);
                    setDetailId(null);
                  }}
                >
                  Back to amounts
                </button>
              </div>
              <div className="asset-breakdown-picker">
                <select
                  aria-label="Select saved entry"
                  value={detail.id}
                  onChange={(event) => setDetailId(event.target.value)}
                >
                  {detailRows.map((row, index) => (
                    <option key={row.id} value={row.id}>
                      {row.label || `${ADD_LABELS[row.category]} ${index + 1}`} ·{" "}
                      {calculateAssetRow(row).net === null
                        ? "Incomplete"
                        : assetMoney(calculateAssetRow(row).net!)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="asset-remove"
                  aria-label="Remove this entry"
                  title="Remove this entry"
                  onClick={() => remove(detail)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {detail.category === "vehicle" ? (
                <EquityFields
                  row={detail}
                  name="Vehicle"
                  patch={(changes) => upsert(detail, changes)}
                />
              ) : (
                <div className="asset-detail-amount">
                  <span className="asset-field-label">Amount</span>
                  <Amount
                    label="Saved entry amount"
                    value={entryAmount(detail)}
                    signed={detail.category !== "debt" && detail.category !== "personal_savings"}
                    onChange={(value) =>
                      upsert(detail, detail.category === "debt" ? { debt: value } : { value })
                    }
                  />
                </div>
              )}
              {detail.previous && !detail.value && (
                <p className="asset-previous">
                  Previous value: {detail.previous.value || "unknown"}; owing:{" "}
                  {detail.previous.debt || "unknown"}. Enter the net amount.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="asset-section-heading">
                <h3>Other assets & debts</h3>
              </div>
              <div className="asset-simple-grid">
                {amountFields.map((category) => {
                  const rows = calculation.rows.filter((row) => row.category === category.key);
                  const row = rows[0];
                  const group = calculateClientAssets({ version: 2, rows });
                  const needsBreakdown =
                    rows.length > 1 ||
                    (!!row?.previous && !row.value) ||
                    (row?.mode === "valuation" && calculateAssetRow(row).net === null);
                  return (
                    <div className="asset-simple-field" key={category.key}>
                      <span className="asset-field-label">{category.label}</span>
                      {needsBreakdown ? (
                        <button
                          type="button"
                          className="asset-group-amount"
                          aria-label={`Edit ${category.label} entries`}
                          onClick={() => {
                            setDetailCategory(category.key);
                            setDetailId(row!.id);
                          }}
                        >
                          <span>
                            {group.invalid
                              ? "Check amounts"
                              : category.key === "debt"
                                ? assetMoney(-group.net)
                                : assetMoney(group.net)}
                          </span>
                          <small>
                            {group.incomplete ? "Incomplete · " : ""}
                            {rows.length} {rows.length === 1 ? "entry" : "entries"} · Edit
                          </small>
                        </button>
                      ) : (
                        <Amount
                          label={category.label}
                          value={row ? entryAmount(row) : ""}
                          signed={category.key !== "debt" && category.key !== "personal_savings"}
                          onChange={(value) => {
                            if (!row && !value.trim()) return;
                            const target = row ?? createAssetRow(category.key);
                            upsert(
                              target,
                              category.key === "vehicle"
                                ? { mode: "equity", equity: value }
                                : category.key === "debt"
                                  ? { debt: value }
                                  : { value },
                            );
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
      <footer className="asset-editor-footer">
        <div className="asset-footer-total">
          <div>
            <p>
              Total net assets <span>incl. super</span>
            </p>
            <span className={`asset-threshold ${tone}`}>
              {total.invalid
                ? "Check highlighted amounts"
                : total.targetReached
                  ? "$750k reached"
                  : "Below $750k"}
            </span>
            {total.incomplete > 0 && (
              <span className="asset-incomplete">
                {" "}
                · {total.incomplete} incomplete {total.incomplete === 1 ? "entry" : "entries"}{" "}
                excluded
              </span>
            )}
          </div>
          <output aria-label="Total net assets" className={tone}>
            {total.invalid ? "—" : assetMoney(total.net)}
          </output>
        </div>
        <div className="asset-footer-meta">
          <p
            role="status"
            className={
              ["error", "conflict", "invalid"].includes(status)
                ? "text-amber-700"
                : "text-muted-foreground"
            }
          >
            {status === "saved" ? (
              <Check size={12} className="text-emerald-600" />
            ) : status === "saving" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {statusText}
          </p>
          {removed && (
            <button
              type="button"
              className="asset-undo"
              disabled={!canAdd}
              onClick={() => {
                const rows = [...calculation.rows];
                rows.splice(removed.index, 0, removed.row);
                setCalculation({ ...calculation, rows });
                setRemoved(null);
              }}
            >
              <RotateCcw size={11} />
              Undo remove
            </button>
          )}
          {status === "error" && (
            <button type="button" onClick={() => void flush()}>
              Retry save
            </button>
          )}
          {status === "conflict" && (
            <button type="button" onClick={onReviewConflict}>
              Review update
            </button>
          )}
        </div>
        {status !== "saved" && status !== "saving" && (
          <p className="asset-save-help">
            {protectedDraft
              ? "Your draft is kept on this browser until it saves."
              : "Keep this page open until your changes save."}
          </p>
        )}
        {!canAdd && <p className="asset-save-help">Maximum 100 saved entries.</p>}
      </footer>
    </>
  );
}

function AssetWorkspace({
  leadId,
  repId,
  initial,
}: {
  leadId: string;
  repId: string;
  initial: SavedAssetCalculation | null;
}) {
  const draft = useClientAssetDraft(leadId, repId, initial);
  const [review, setReview] = useState<{ saved: SavedAssetCalculation | null } | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  return (
    <>
      {review ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <h3 className="font-semibold">Another version was saved</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare the entries before deciding which version to keep.
          </p>
          <div className="my-4 space-y-4">
            {[
              { label: "Saved on client", value: review.saved?.calculation },
              { label: "Your draft", value: draft.calculation },
            ].map((version) => (
              <section key={version.label} className="rounded-xl border p-3">
                <h4 className="mb-3 text-sm font-semibold">{version.label}</h4>
                {version.value ? (
                  <>
                    <AssetTotals calculation={version.value} />
                    <ul className="mt-3 space-y-2 border-t pt-3 text-xs">
                      {version.value.rows.map((row) => (
                        <li key={row.id} className="break-words">
                          {row.label ||
                            ASSET_CATEGORIES.find((category) => category.key === row.category)
                              ?.label}{" "}
                          · {assetRowDescription(row)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm">No saved entries.</p>
                )}
              </section>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void draft.resolve(review.saved, false);
                setReview(null);
              }}
            >
              Use saved version
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void draft.resolve(review.saved, true);
                setReview(null);
              }}
            >
              Replace with my draft
            </Button>
            <Button variant="ghost" onClick={() => setReview(null)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <>
          {(reviewError || reviewLoading) && (
            <p role={reviewError ? "alert" : "status"} className="border-b px-5 py-3 text-xs">
              {reviewError || "Loading saved version…"}
            </p>
          )}
          <ClientAssetEditor
            {...draft}
            onReviewConflict={() => {
              setReviewLoading(true);
              setReviewError("");
              void fetchClientAssets(leadId)
                .then((saved) => setReview({ saved }))
                .catch(() => setReviewError("Couldn’t load the saved version. Try again."))
                .finally(() => setReviewLoading(false));
            }}
          />
        </>
      )}
    </>
  );
}

/** Independent utility window; the existing call workspace remains fully usable. */
export function ClientAssetCalculator({
  leadId,
  repId,
  clientName,
  open,
  onClose,
}: {
  leadId: string;
  repId: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["client-assets", leadId],
    queryFn: () => fetchClientAssets(leadId),
    enabled: open,
    retry: false,
  });
  if (!open) return null;
  return (
    <FloatingAssetWindow title="Net assets" clientName={clientName} onClose={onClose}>
      {query.isPending ? (
        <p role="status" className="p-5 text-sm">
          Loading saved assets…
        </p>
      ) : query.isError && query.data === undefined ? (
        <div className="space-y-3 p-5">
          <p role="alert">Couldn’t load this client’s assets. Retry before entering figures.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <AssetWorkspace
          key={`${repId}:${leadId}`}
          leadId={leadId}
          repId={repId}
          initial={query.data ?? null}
        />
      )}
    </FloatingAssetWindow>
  );
}

export function ClientAssetReview({ leadId }: { leadId: string }) {
  const query = useQuery({
    queryKey: ["client-assets", leadId],
    queryFn: () => fetchClientAssets(leadId),
    retry: false,
  });
  const includesPersonalSavings = query.data?.calculation.rows.some(
    (row) => row.category === "savings",
  );
  return (
    <section className="rounded-xl border p-5">
      <h2 className="mb-3 font-semibold">Saved net assets</h2>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading assets…</p>
      ) : query.isError ? (
        <div>
          <p className="text-sm">Couldn’t load saved assets.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>
            Retry assets
          </Button>
        </div>
      ) : query.data ? (
        <>
          <AssetTotals calculation={query.data.calculation} />
          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-sm font-medium">View breakdown</summary>
            <dl className="mt-3 space-y-3">
              {query.data.calculation.rows.map((row) => (
                <div key={row.id} className="flex flex-wrap justify-between gap-2 text-sm">
                  <dt className="break-words">
                    {row.label ||
                      ASSET_CATEGORIES.find((category) => category.key === row.category)?.label}
                  </dt>
                  <dd className="text-xs text-muted-foreground">
                    {assetRowDescription(row)} ·{" "}
                    {row.category === "personal_savings" && includesPersonalSavings
                      ? "Included in savings total"
                      : "Net"}{" "}
                    {calculateAssetRow(row).net === null
                      ? "unknown"
                      : assetMoney(calculateAssetRow(row).net!)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No asset estimate saved yet.</p>
      )}
    </section>
  );
}
