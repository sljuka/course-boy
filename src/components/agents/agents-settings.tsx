import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CopyableCode } from "@/components/copyable-code";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { useMcpStatusQuery, useRegenerateMcpTokenMutation, useSetMcpEnabledMutation } from "@/lib/mcp-queries";

// Settings → Agents (SLJ-68): let an agent on this computer (Claude Code,
// Claude Desktop, …) make courses and programs through Matko's MCP server.
// Off until turned on; then the address, the access code, and the command
// that sets Claude Code up with both.
export function AgentsSettings() {
  const { t } = useTranslation();
  const { data: status } = useMcpStatusQuery();
  const setEnabled = useSetMcpEnabledMutation();
  const regenerateToken = useRegenerateMcpTokenMutation();
  if (!status) return null;

  const claudeCodeCommand =
    status.url && status.token
      ? `claude mcp add --transport http matko ${status.url} --header "Authorization: Bearer ${status.token}"`
      : null;

  return (
    <>
      <FieldLabel htmlFor="settings-agents-enabled">
        <Field orientation="horizontal">
          <Checkbox
            checked={status.enabled}
            data-testid="settings-agents-enabled"
            disabled={setEnabled.isPending}
            id="settings-agents-enabled"
            onCheckedChange={(checked) => setEnabled.mutate(checked === true)}
          />
          <FieldContent>
            <FieldTitle>{t("agents.enable")}</FieldTitle>
            <FieldDescription>{t("agents.enableHint")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      {status.enabled && status.error && <FieldError>{t("agents.notRunning", { error: status.error })}</FieldError>}
      {status.enabled && status.url && status.token && claudeCodeCommand && (
        <div className="flex flex-col gap-4" data-testid="settings-agents-connection">
          <CopyableCode label={t("agents.address")} testId="settings-agents-url" value={status.url} />
          <CopyableCode label={t("agents.accessCode")} testId="settings-agents-token" value={status.token} />
          <CopyableCode label={t("agents.claudeCode")} testId="settings-agents-command" value={claudeCodeCommand} />
          <Field className="gap-8 has-[>[data-slot=field-content]]:items-center" orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("agents.newAccessCode")}</FieldTitle>
              <FieldDescription>{t("agents.newAccessCodeHint")}</FieldDescription>
            </FieldContent>
            <Button
              data-testid="settings-agents-new-token"
              disabled={regenerateToken.isPending}
              onClick={() => regenerateToken.mutate()}
              variant="outline"
            >
              <RefreshCw aria-hidden="true" />
              {t("agents.newAccessCodeAction")}
            </Button>
          </Field>
        </div>
      )}
    </>
  );
}
