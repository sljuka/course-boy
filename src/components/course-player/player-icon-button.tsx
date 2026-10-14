import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// A round icon button in the player's action bar, its label both read out
// (aria-label) and shown on hover (tooltip), like `MnemonicsToggle`, with
// its keyboard shortcut if it has one.
export function PlayerIconButton({
  children,
  label,
  onClick,
  shortcut,
  testId,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  testId?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            data-testid={testId}
            onClick={onClick}
            shape="circle"
            size="icon-sm"
            variant="subtle"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{shortcut ? `${label} (${shortcut})` : label}</TooltipContent>
    </Tooltip>
  );
}
