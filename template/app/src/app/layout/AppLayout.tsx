import { ReactNode, useState, memo } from "react";
import { type AuthUser } from "wasp/auth";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

export const AppLayout = memo(function AppLayout({ children, user }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <AppTopbar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            user={user}
          />
          <main className="flex-1">
            <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-8 lg:px-10 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
});
