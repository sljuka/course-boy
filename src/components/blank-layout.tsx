import { Outlet } from "react-router-dom";

import { PagePanel } from "@/components/ui/page-panel";

// Lesson/test players and draft previews: the page card with no sidebar.
export const BlankLayout = () => {
  return (
    <PagePanel className="ml-2">
      <Outlet />
    </PagePanel>
  );
};
