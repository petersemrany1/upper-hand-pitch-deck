// Ported from the Legal app (family-law-floater/src/components/settings/tab-access-picker.tsx). Re-run the port script to refresh.
import { Button } from "@/legal/components/ui/button";
import { Checkbox } from "@/legal/components/ui/checkbox";
import { PORTAL_PAGES, PORTAL_PAGE_URLS, type PortalPage } from "@/legal/lib/portal-pages";

export function TabAccessPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly string[];
  onChange: (pages: PortalPage[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="text-sm font-semibold">Tabs they can access</legend>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {value.length} of {PORTAL_PAGES.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange([...PORTAL_PAGE_URLS])}
          >
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...new Set(PORTAL_PAGES.map((page) => page.group))].map((group) => (
          <div key={group} className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            {PORTAL_PAGES.filter((page) => page.group === group).map((page) => (
              <label
                key={page.url}
                className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-sm"
              >
                <Checkbox
                  disabled={disabled}
                  checked={value.includes(page.url)}
                  onCheckedChange={(checked) =>
                    onChange(
                      PORTAL_PAGE_URLS.filter((url) =>
                        url === page.url ? checked === true : value.includes(url),
                      ),
                    )
                  }
                />
                {page.title}
              </label>
            ))}
          </div>
        ))}
      </div>
      {value.length === 0 && (
        <p role="status" className="text-sm text-amber-700">
          No tabs selected. This person will have no portal access until you enable a tab.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Settings and account administration are admin-only. Tab access keeps existing permissions
        for client records and admin actions.
      </p>
    </fieldset>
  );
}
