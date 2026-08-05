import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DraftSectionCreateForm({
  isPending,
  onCancel,
  onSubmit,
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (input: { description: string; title: string }) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setShowValidationError(true);
      return;
    }

    setShowValidationError(false);
    onSubmit({
      title,
      description,
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="draft-section-title">
          {t("draftDetails.createSection.fields.title")}
        </Label>
        <Input
          autoFocus
          className="rounded-2xl"
          id="draft-section-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("draftDetails.createSection.placeholders.title")}
          value={title}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="draft-section-description">
          {t("draftDetails.createSection.fields.description")}
        </Label>
        <Textarea
          className="min-h-28 rounded-2xl"
          id="draft-section-description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("draftDetails.createSection.placeholders.description")}
          value={description}
        />
        <CardDescription>
          {t("draftDetails.createSection.descriptionHint")}
        </CardDescription>
      </div>
      {showValidationError && (
        <Alert className="border-rose-200 bg-rose-50/90 text-rose-950 shadow-[0_12px_28px_-24px_rgba(244,63,94,0.35)]">
          <AlertTitle className="text-rose-950">
            {t("draftDetails.createSection.validationTitle")}
          </AlertTitle>
          <AlertDescription className="mt-1.5 text-rose-900/90">
            {t("draftDetails.createSection.validationDescription")}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} size="lg" type="submit">
          {isPending
            ? t("draftDetails.createSection.creating")
            : t("draftDetails.createSection.submit")}
        </Button>
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="lg"
          type="button"
          variant="secondary"
        >
          {t("draftDetails.createSection.cancel")}
        </Button>
      </div>
    </form>
  );
}
