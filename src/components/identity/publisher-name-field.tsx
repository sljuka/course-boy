import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { shortPublisherId } from "@/lib/maintainers-queries";
import { MAX_PUBLISHER_NAME_LENGTH } from "@/lib/publishers";

// The Publisher name: optional, carried by every course and program the
// teacher publishes and shown to students as "Ana (4y9dgb89…)", or just
// "4y9dgb89…" without one. The example uses their own Publisher ID once
// there is one.
export function PublisherNameField({
  disabled = false,
  onBlur,
  onChange,
  publisherId,
  value,
}: {
  disabled?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  publisherId?: string | null;
  value: string;
}) {
  const { t } = useTranslation();
  const id = publisherId ? shortPublisherId(publisherId) : "4y9dgb89";
  const name = value.trim();

  return (
    <Field>
      <FieldLabel htmlFor="publisher-name">{t("publisherIdentity.publisherName")}</FieldLabel>
      <Input
        data-testid="publisher-name-input"
        disabled={disabled}
        id="publisher-name"
        maxLength={MAX_PUBLISHER_NAME_LENGTH}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("publisherIdentity.publisherNamePlaceholder")}
        value={value}
      />
      <FieldDescription data-testid="publisher-name-hint">
        {name
          ? t("publisherIdentity.publisherNameHint", { example: t("publishers.nameWithId", { id, name }) })
          : t("publisherIdentity.publisherNameHintNone", { example: t("publishers.shortId", { id }) })}
      </FieldDescription>
    </Field>
  );
}
