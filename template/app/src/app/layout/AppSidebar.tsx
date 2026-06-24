import {
  Bot, Globe, MessageSquare, Users, BarChart3, Settings, LayoutDashboard, BookOpen, X, Download, Building2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Link, routes } from "wasp/client/router";
import { useQuery } from "wasp/client/operations";
import { getOrganization } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import { cn } from "../../client/utils";

interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  user: AuthUser;
}

const navItems = [
  { name: "Dashboard", to: routes.DashboardRoute.to, icon: LayoutDashboard },
  { name: "AI Agents", to: routes.AgentsRoute.to, icon: Bot },
  { name: "Websites", to: routes.WebsitesRoute.to, icon: Globe },
  { name: "Install", to: routes.InstallRoute.to, icon: Download },
  { name: "Conversations", to: routes.ConversationsRoute.to, icon: MessageSquare },
  { name: "Leads", to: routes.LeadsRoute.to, icon: Users },
  { name: "Knowledge Base", to: routes.KnowledgeBasesRoute.to, icon: BookOpen },
  { name: "Analytics", to: routes.AnalyticsRoute.to, icon: BarChart3 },
  { name: "Settings", to: routes.AppSettingsRoute.to, icon: Settings },
];

export function AppSidebar({ sidebarOpen, setSidebarOpen }: AppSidebarProps) {
  const location = useLocation();
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const storedSidebarExpanded = localStorage.getItem("app-sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );
  const { data: org } = useQuery(getOrganization) as any

  useEffect(() => {
    const clickHandler = ({ target }: PointerEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("app-sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-sidebar z-9999 w-72.5 absolute left-0 top-0 flex h-screen flex-col overflow-y-hidden border-r border-border/50 duration-300 ease-linear lg:static lg:translate-x-0",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
        },
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 px-6 py-6 lg:py-7">
        <Link to={routes.DashboardRoute.to} className="flex items-center gap-3">
          {org?.logo ? (
            <img src={org.logo} alt="" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold">
              AI
            </div>
          )}
          <span className="text-foreground text-xl font-semibold tracking-tight">{org?.name || "AI Agent"}</span>
        </Link>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="px-4 py-4 lg:px-5 lg:py-6">
          <div>
            <h3 className="text-muted-foreground mb-3 ml-3 text-xs font-semibold uppercase tracking-wider">
              Main Menu
            </h3>
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.to}
                    end={item.to === routes.DashboardRoute.to}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}

