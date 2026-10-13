import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Page } from "@/components/page/page";
import { CardDescription } from "@/components/ui/card";
import { useOwnChannelQuery } from "@/lib/channel-queries";
import { useProgramQuery } from "@/lib/program-queries";
import { ProgramEditor } from "@/pages/program-editor-page";

// My channel (SLJ-31): your channel, created the first time you open it,
// edited like a program (name, description, logo, banner, colors, and what it
// shows).
export function MyChannelPage() {
  const { t } = useTranslation();
  const { data: own, error } = useOwnChannelQuery();
  const { data: channel, error: readError } = useProgramQuery(own?.programId);

  if (error || readError) {
    return (
      <Page breadcrumbs={[{ icon: Radio, label: t("sidebar.myChannel") }]}>
        <CardDescription>{t("channels.loadError")}</CardDescription>
      </Page>
    );
  }
  if (!channel) return null;
  return <ProgramEditor initial={channel} key={channel.id} />;
}
