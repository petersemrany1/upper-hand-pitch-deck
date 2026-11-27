// Ported from the Legal app (family-law-floater/src/components/firms/FirmContactEditor.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { Pencil, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateFirmContact } from "@/legal/lib/firm-contact.functions";
import { useFirmAutosave, firmSaveLabel } from "@/legal/hooks/use-firm-autosave";
import type { FirmApplication } from "@/legal/lib/firm-applications";
type ContactField = "first_name" | "last_name" | "firm_name" | "phone" | "email";
export function FirmContactEditor({
  app,
  userId,
  label,
  fields,
  children,
  onEditingChange,
  onSyncingChange,
}: {
  app: FirmApplication;
  userId: string;
  label: string;
  fields: { key: ContactField; label: string; type?: "text" | "email" | "tel" }[];
  children: React.ReactNode;
  onEditingChange: (key: string, editing: boolean) => void;
  onSyncingChange?: (key: string, syncing: boolean) => void;
}) {
  const client = useQueryClient();
  const save = useServerFn(updateFirmContact);
  const form = useFirmAutosave(
    `firm-contact:v1:${userId}:${app.id}:${label}`,
    Object.fromEntries(fields.map((field) => [field.key, app[field.key] ?? ""])),
    async (patch) => {
      const updated = await save({ data: { applicationId: app.id, patch } });
      client.setQueryData<FirmApplication[]>(["firm-applications"], (rows) =>
        rows?.map((row) => (row.id === updated.id ? updated : row)),
      );
      void client.invalidateQueries({ queryKey: ["firm-applications"] });
      void client.invalidateQueries({ queryKey: ["firm-conversation", app.id] });
      void client.invalidateQueries({ queryKey: ["firm-conversation-inbox"] });
    },
  );
  const [editing, setEditing] = useState(form.status !== "saved");
  useEffect(() => {
    onEditingChange(label, !form.protected);
  }, [form.protected, label, onEditingChange]);
  useEffect(() => {
    onSyncingChange?.(label, form.status !== "saved");
  }, [form.status, label, onSyncingChange]);
  if (!editing)
    return (
      <div className="firm-editable-contact">
        {children}
        <button
          type="button"
          aria-label={`Edit ${label.toLowerCase()}`}
          title={`Edit ${label.toLowerCase()}`}
          onClick={() => setEditing(true)}
        >
          <Pencil size={13} />
        </button>
        {form.status === "retry" && (
          <button type="button" onClick={() => setEditing(true)}>
            Check edit
          </button>
        )}
      </div>
    );
  return (
    <form
      className="firm-contact-edit"
      onSubmit={(event) => {
        event.preventDefault();
        void form.flush();
        setEditing(false);
      }}
    >
      {fields.map((field) => (
        <label key={field.key}>
          {field.label}
          <input
            autoFocus={field === fields[0]}
            type={field.type ?? "text"}
            value={form.answers[field.key] ?? ""}
            maxLength={field.key === "email" ? 254 : field.key === "phone" ? 40 : 160}
            onChange={(event) => form.change(field.key, event.target.value)}
            onBlur={() => void form.flush()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                void form.flush();
                setEditing(false);
              }
            }}
          />
        </label>
      ))}
      <div className="firm-contact-edit-actions">
        <button type="submit">
          <Check size={13} /> Done
        </button>
      </div>
      <button
        type="button"
        className={`crm-save-status ${form.status === "retry" ? "has-error" : ""}`}
        onClick={() => void form.flush()}
        aria-live="polite"
      >
        {form.status === "retry"
          ? `${firmSaveLabel(form.status, form.protected)} · check ${label.toLowerCase()}`
          : firmSaveLabel(form.status, form.protected)}
      </button>
    </form>
  );
}
