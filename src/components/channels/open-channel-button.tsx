import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PublisherChannel } from "@/lib/publishers";
import { useImportCourseMutation } from "@/lib/sharing-queries";

// "Open channel" (SLJ-31): its page when it's here, else brought here by its
// code first (like a program's), then opened.
export function OpenChannelButton({ channel, testId }: { channel: PublisherChannel; testId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const importMutation = useImportCourseMutation();

  if (channel.programId) {
    return (
      <Button data-testid={testId} nativeButton={false} render={<Link to={`/channels/${channel.programId}`} />} size="xs" variant="secondary">
        <Radio aria-hidden="true" />
        {t("channels.open")}
      </Button>
    );
  }
  return (
    <Button
      data-testid={testId}
      disabled={importMutation.isPending}
      // Awaited rather than an onSuccess callback: the import refreshes what
      // shows this button (it becomes a link), and a callback of a button
      // that's gone never runs.
      onClick={async () => {
        const result = await importMutation.mutateAsync({ code: channel.code }).catch(() => null);
        if (result && "programId" in result) navigate(`/channels/${result.programId}`);
      }}
      size="xs"
      variant="secondary"
    >
      {importMutation.isPending ? <Spinner aria-hidden="true" /> : <Radio aria-hidden="true" />}
      {t("channels.open")}
    </Button>
  );
}
