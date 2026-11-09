"use client";

import { authClient } from "@mqdms/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@mqdms/ui/components/sidebar";
import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationSwitcherProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export function OrganizationSwitcher({ organization }: OrganizationSwitcherProps) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const { data: organizations } = authClient.useListOrganizations();

  async function handleOrganizationChange(organizationId: string) {
    if (organizationId === organization.id || isSwitching) {
      return;
    }

    setIsSwitching(true);

    const { error } = await authClient.organization.setActive({
      organizationId,
    });

    if (error) {
      setIsSwitching(false);
      return;
    }

    router.refresh();
    setIsSwitching(false);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                {organization.name.charAt(0).toUpperCase()}
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{organization.name}</span>

                <span className="truncate text-xs">{organization.slug}</span>
              </div>

              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-56" sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>

            {organizations?.map((item) => (
              <DropdownMenuItem
                disabled={isSwitching}
                key={item.id}
                onClick={() => handleOrganizationChange(item.id)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border text-xs font-medium">
                  {item.name.charAt(0).toUpperCase()}
                </div>

                <span className="truncate">{item.name}</span>

                {item.id === organization.id && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
