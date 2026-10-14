import { Outlet } from "react-router-dom";

import { PagePanel } from "@/components/ui/page-panel";
import { useImmersiveMode, useImmersiveModeShortcut } from "@/lib/use-immersive-mode";

// Lesson/test players and draft previews: the page card with no sidebar.
// Full screen (SLJ-133) carries on from one player page to the next (a lesson
// to its test) and ends when the reader leaves the player.
export const BlankLayout = () => {
  const { isImmersive } = useImmersiveMode();
  useImmersiveModeShortcut();

  return (
    <PagePanel className={isImmersive ? undefined : "ml-2"} immersive={isImmersive}>
      <Outlet />
    </PagePanel>
  );
};
