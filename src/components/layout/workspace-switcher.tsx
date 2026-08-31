"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { switchWorkspace } from "@/app/actions/workspaces";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type WorkspaceOption = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

function workspaceInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "W"
  );
}

export function WorkspaceSwitcher({
  workspaceName,
  workspaceId,
  workspaces,
}: {
  workspaceName: string;
  workspaceId: string;
  workspaces: WorkspaceOption[];
}) {
  // One workspace is the common case; a dropdown that only ever contains the
  // thing you are already looking at is noise, so keep the plain link.
  if (workspaces.length <= 1) {
    return (
      <Link
        href="/settings/workspace"
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-[#3f3f46] hover:text-foreground"
        title="Workspace settings"
      >
        <span
          aria-hidden
          className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[9px] font-semibold text-foreground"
        >
          {workspaceInitials(workspaceName)}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">
          {workspaceName}
        </span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-[#3f3f46] hover:text-foreground"
          aria-label={`Workspace: ${workspaceName}. Switch workspace`}
        >
          <span
            aria-hidden
            className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[9px] font-semibold text-foreground"
          >
            {workspaceInitials(workspaceName)}
          </span>
          <span className="hidden max-w-[120px] truncate sm:inline">
            {workspaceName}
          </span>
          <ChevronsUpDown className="size-3 shrink-0" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((workspace) => {
          const active = workspace.id === workspaceId;
          return (
            <DropdownMenuItem key={workspace.id} asChild>
              <form action={switchWorkspace} className="w-full">
                <input
                  type="hidden"
                  name="workspace_id"
                  value={workspace.id}
                />
                <button
                  type="submit"
                  disabled={active}
                  aria-current={active ? "true" : undefined}
                  className="flex w-full cursor-pointer items-center gap-2 text-left disabled:cursor-default"
                >
                  <Check
                    className={`size-3.5 shrink-0 ${active ? "" : "opacity-0"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {workspace.name}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                    {workspace.role.toLowerCase()}
                  </span>
                </button>
              </form>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/workspace">
            <Settings className="size-3.5" aria-hidden />
            Workspace settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/workspace#create">
            <Plus className="size-3.5" aria-hidden />
            New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
