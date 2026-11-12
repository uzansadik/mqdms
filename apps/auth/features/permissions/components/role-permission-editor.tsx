"use client";

import { resources } from "@mqdms/auth/permissions";
import { Checkbox } from "@mqdms/ui/components/checkbox";

type RolePermissionEditorProps = {
  /** Seçili izinler `resource:action` biçiminde. */
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

/**
 * Rol izin editörü.
 *
 * İzinler permission kataloğundan gelir; katalog dışı bir aksiyon seçilemez.
 */
export function RolePermissionEditor({
  selected,
  onChange,
  disabled = false,
}: RolePermissionEditorProps) {
  const selectedSet = new Set(selected);

  function toggle(resource: string, action: string, checked: boolean) {
    const key = `${resource}:${action}`;

    if (checked) {
      onChange([...selected, key]);

      return;
    }

    onChange(selected.filter((item) => item !== key));
  }

  return (
    <div className="space-y-4">
      {Object.entries(resources).map(([resourceKey, resource]) => (
        <div key={resourceKey}>
          <p className="text-sm font-medium">{resource.label}</p>

          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {resource.actions.map((action) => {
              const key = `${resourceKey}:${action}`;
              const checked = selectedSet.has(key);

              return (
                <div className="flex items-center gap-2 text-sm" key={key}>
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    id={`permission-${key}`}
                    onCheckedChange={(value) =>
                      toggle(resourceKey, action, value === true)
                    }
                  />

                  <label className="cursor-pointer" htmlFor={`permission-${key}`}>
                    {action}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
