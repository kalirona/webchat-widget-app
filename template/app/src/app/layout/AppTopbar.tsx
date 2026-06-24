import { Building2, ChevronDown, LogOut, User, Settings, Shield } from "lucide-react";
import { useState } from "react";
import { logout } from "wasp/client/auth";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getOrganization } from "wasp/client/operations";
import { Link as WaspRouterLink } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { DarkModeSwitcher } from "../../client/components/DarkModeSwitcher";
import { cn } from "../../client/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";

export function AppTopbar(props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  user: AuthUser;
}) {
  const [open, setOpen] = useState(false);
  const { data: org } = useQuery(getOrganization) as any

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex w-full border-b border-border/50 backdrop-blur-xl">
      <div className="flex grow items-center justify-between px-6 py-4 md:px-8 lg:px-10">
        {/* Mobile hamburger */}
        <div className="flex items-center lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="border-border/50 bg-background/80 z-99999 flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm backdrop-blur-sm transition-colors hover:bg-muted lg:hidden"
          >
            <span className="flex flex-col gap-1.5">
              <span className={cn("block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300", props.sidebarOpen ? "translate-y-2 rotate-45" : "")} />
              <span className={cn("block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300", props.sidebarOpen ? "opacity-0" : "")} />
              <span className={cn("block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300", props.sidebarOpen ? "-translate-y-2 -rotate-45" : "")} />
            </span>
          </button>
        </div>

        {/* Organization name (desktop) */}
        {org && (
          <div className="hidden items-center gap-2.5 lg:flex">
            {org.logo ? (
              <img src={org.logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Building2 className="text-muted-foreground h-4 w-4" />
              </div>
            )}
            <span className="text-foreground text-sm font-semibold">{org.name}</span>
          </div>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <DarkModeSwitcher />
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:bg-muted hover:shadow-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                  {props.user.username ? props.user.username.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                </div>
                <span className="hidden text-foreground lg:block">{props.user.username || "User"}</span>
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <WaspRouterLink to={routes.AccountRoute.to} onClick={() => setOpen(false)} className="flex w-full items-center gap-3">
                  <User className="h-4 w-4" />
                  Account
                </WaspRouterLink>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <WaspRouterLink to={routes.AppSettingsRoute.to} onClick={() => setOpen(false)} className="flex w-full items-center gap-3">
                  <Settings className="h-4 w-4" />
                  Organization Settings
                </WaspRouterLink>
              </DropdownMenuItem>
              {props.user.isAdmin && (
                <DropdownMenuItem>
                  <WaspRouterLink to={routes.AdminRoute.to} onClick={() => setOpen(false)} className="flex w-full items-center gap-3">
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </WaspRouterLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <button type="button" onClick={() => logout()} className="flex w-full items-center gap-3">
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

