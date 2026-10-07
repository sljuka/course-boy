import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";

// One item to tick: what goes, what that means, and a way to copy it first.
export function RemovalChecklistItem({
  checked,
  description,
  id,
  onCheckedChange,
  onOpen,
  openLabel,
  title,
}: {
  checked: boolean;
  description: string;
  id: string;
  onCheckedChange: (checked: boolean) => void;
  onOpen?: () => void;
  openLabel: string;
  title: string;
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox checked={checked} data-testid={id} id={id} onCheckedChange={(next) => onCheckedChange(next === true)} />
      <FieldContent>
        <FieldLabel htmlFor={id}>
          <FieldTitle>{title}</FieldTitle>
        </FieldLabel>
        <FieldDescription>{description}</FieldDescription>
        {onOpen && (
          <div>
            <Button onClick={onOpen} size="sm" type="button" variant="secondary">
              <FolderOpen aria-hidden="true" />
              {openLabel}
            </Button>
          </div>
        )}
      </FieldContent>
    </Field>
  );
}
