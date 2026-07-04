import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent } from "@/components/common/sheet";
import { Logo } from "@/components/ui/logo";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function SidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar — persistent from md breakpoint up */}
      <div className="hidden md:flex h-screen shrink-0">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      {/* Sidebar — slide-in drawer below md */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 max-w-[80vw] border-none">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile top bar — hidden from md up, the persistent sidebar covers it there */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Logo className="h-6 w-6 rounded-sm" />
          <span className="text-sm font-semibold tracking-tight">You Collab</span>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export { SidebarLayout };
