import { useState } from "react";
import { CalendarDays, CalendarRange, CheckCircle2, Inbox, Layers, MoreHorizontal, PhoneCall, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LIST_COLORS, type ListKey, type SmartListKey, type TodoList } from "@/lib/todo";
import { C, ListDot } from "./bits";

export const SMART_LISTS: { key: SmartListKey; label: string; icon: typeof Inbox }[] = [
  { key: "today", label: "Today", icon: CalendarDays },
  { key: "next7", label: "Next 7 Days", icon: CalendarRange },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "all", label: "All", icon: Layers },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "chase", label: "Chase requests", icon: PhoneCall },
];

export function ListsNav({
  active,
  onSelect,
  counts,
  lists,
  listsOn,
  onCreate,
  onRename,
  onRecolor,
  onDelete,
}: {
  active: ListKey;
  onSelect: (k: ListKey) => void;
  counts: Partial<Record<ListKey, number | null>>;
  lists: TodoList[];
  listsOn: boolean;
  onCreate: (name: string, color: string) => Promise<TodoList | null>;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LIST_COLORS[0]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<TodoList | null>(null);

  const startAdd = () => {
    setNewName("");
    setNewColor(LIST_COLORS[lists.length % LIST_COLORS.length]);
    setAdding(true);
  };
  const commitAdd = async () => {
    const name = newName.trim();
    setAdding(false);
    if (!name) return;
    const made = await onCreate(name, newColor);
    if (made) onSelect(`list:${made.id}`);
  };
  const commitRename = () => {
    if (renaming && renameText.trim()) onRename(renaming, renameText.trim());
    setRenaming(null);
  };

  return (
    <nav className="flex flex-col gap-0.5 p-2 text-sm" aria-label="To-do lists">
      {SMART_LISTS.map((s) => (
        <NavItem
          key={s.key}
          active={active === s.key}
          onClick={() => onSelect(s.key)}
          icon={<s.icon className="h-4 w-4" />}
          label={s.label}
          count={counts[s.key]}
        />
      ))}

      {listsOn && (
        <>
          <div className="mt-4 flex items-center px-2.5 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.faint }}>
              Lists
            </span>
            <button
              type="button"
              onClick={startAdd}
              aria-label="New list"
              className="ml-auto rounded-md p-1 transition-colors hover:bg-[#ececea]"
              style={{ color: C.muted }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {lists.map((l) =>
            renaming === l.id ? (
              <div key={l.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <ListDot color={l.color} />
                <input
                  autoFocus
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  maxLength={80}
                  aria-label="List name"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            ) : (
              <div key={l.id} className="group relative">
                <NavItem
                  active={active === `list:${l.id}`}
                  onClick={() => onSelect(`list:${l.id}`)}
                  icon={<span className="flex w-4 justify-center"><ListDot color={l.color} /></span>}
                  label={l.name}
                  count={counts[`list:${l.id}`]}
                  hideCountOnHover
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Options for ${l.name}`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity hover:bg-[#e6e6e3] focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                      style={{ color: C.muted }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onSelect={() => {
                        setRenameText(l.name);
                        setRenaming(l.id);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <div className="flex flex-wrap gap-1.5 px-2 py-2">
                      {LIST_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Colour ${c}`}
                          onClick={() => onRecolor(l.id, c)}
                          className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                          style={{ background: c, boxShadow: l.color === c ? `0 0 0 2px #fff, 0 0 0 3.5px ${c}` : "none" }}
                        />
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setConfirmDelete(l)} className="text-[#b83232] focus:text-[#b83232]">
                      Delete list
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          )}

          {adding ? (
            <div className="mt-0.5 rounded-lg px-2.5 py-2" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <ListDot color={newColor} />
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitAdd();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  onBlur={(e) => {
                    // Clicking a colour swatch shouldn't close the editor.
                    if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) void commitAdd();
                  }}
                  placeholder="List name"
                  maxLength={80}
                  aria-label="New list name"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-2 flex gap-1.5 pl-[18px]">
                {LIST_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setNewColor(c)}
                    className="h-4 w-4 rounded-full"
                    style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px #fff, 0 0 0 3px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          ) : (
            lists.length === 0 && (
              <button
                type="button"
                onClick={startAdd}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[#efefed]"
                style={{ color: C.faint }}
              >
                <Plus className="h-4 w-4" /> New list
              </button>
            )
          )}
        </>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Its tasks aren't deleted. They move to the Inbox.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              style={{ background: "#b83232" }}
              onClick={() => {
                if (!confirmDelete) return;
                if (active === `list:${confirmDelete.id}`) onSelect("inbox");
                onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
  hideCountOnHover,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number | null | undefined;
  hideCountOnHover?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[#efefed]"
      style={{ background: active ? C.accentSoft : undefined, color: active ? C.accent : C.text, fontWeight: active ? 600 : 400 }}
    >
      <span className="flex w-4 shrink-0 justify-center" style={{ color: active ? C.accent : C.muted }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!!count && (
        <span
          className={`text-xs tabular-nums ${hideCountOnHover ? "group-hover:opacity-0" : ""}`}
          style={{ color: active ? C.accent : C.faint, fontWeight: 400 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
