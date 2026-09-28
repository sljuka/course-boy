import { useEffect } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { useTitleBarSidebar } from "@/lib/use-title-bar-sidebar";

// Render inside a layout's `SidebarProvider` to let the title bar's sidebar
// button toggle that layout's sidebar. See `use-title-bar-sidebar.ts`.
function RegisterTitleBarSidebarToggle() {
  const { toggleSidebar } = useSidebar();
  const { register } = useTitleBarSidebar();

  useEffect(() => register(toggleSidebar), [register, toggleSidebar]);

  return null;
}

export { RegisterTitleBarSidebarToggle };
