import { Eye, Library, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { ItemContextMenu } from "@/components/item-context-menu";
import { Page } from "@/components/page/page";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgramProgressIcon } from "@/components/programs/program-progress-icon";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { ProgramSummary } from "@/lib/program-package";
import { useCreateProgramMutation, useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";
import { useNewTabLink } from "@/lib/use-new-tab-link";

// My programs (SLJ-32): the teacher's programs, each an ordered set of
// courses with its own page. New program asks for a title, then opens the
// editor.
export function MyProgramsPage() {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: programs = [], isLoading } = useProgramsQuery(locale);
  const [isCreating, setIsCreating] = useState(false);
  // A channel (SLJ-31) is stored as a program but has its own page.
  const own = programs.filter((program) => program.distribution === "local" && program.kind === "program");

  return (
    <Page
      actions={
        <Button data-testid="new-program" onClick={() => setIsCreating(true)} size="sm" title={t("programs.new")}>
          <Plus aria-hidden="true" />
          <ButtonLabel>{t("programs.new")}</ButtonLabel>
        </Button>
      }
      breadcrumbs={[{ icon: Library, label: t("sidebar.myPrograms") }]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("programs.myTitle")}</CardTitle>
          <CardDescription className="max-w-3xl">{t("programs.myDescription")}</CardDescription>
        </div>
      }
    >
      {!isLoading && own.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <CardDescription>{t("programs.empty")}</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col">
          {own.map((program) => (
            <MyProgramRow key={program.id} program={program} />
          ))}
        </div>
      )}
      <NewProgramDialog onClose={() => setIsCreating(false)} open={isCreating} />
    </Page>
  );
}

// One of your programs: the row opens its editor. Right-click: Open in new
// tab, and Open as student (its page, as students see it); a middle-click or
// ⌘-click opens the editor in a new tab.
function MyProgramRow({ program }: { program: ProgramSummary }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const href = `/my-programs/${program.id}`;
  const newTabLink = useNewTabLink(href);

  return (
    <ItemContextMenu
      actions={[
        {
          icon: Eye,
          id: "open-as-student",
          label: t("programs.openAsStudent"),
          onSelect: () => navigate(`/programs/${program.id}`),
        },
      ]}
      href={href}
    >
      <ListRow data-testid="my-program">
        <ProgramProgressIcon courseIds={program.courseIds} />
        <ListRowLink render={<Link to={href} {...newTabLink} />}>{program.title || t("programs.untitled")}</ListRowLink>
        <ListRowMeta align="end">{t("programs.courseCount", { count: program.courseCount })}</ListRowMeta>
      </ListRow>
    </ItemContextMenu>
  );
}

function NewProgramDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const createMutation = useCreateProgramMutation();

  function close() {
    setTitle("");
    onClose();
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            createMutation.mutate(
              { locale, title: title.trim() },
              { onSuccess: ({ programId }) => navigate(`/my-programs/${programId}`) },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("programs.new")}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="new-program-title">{t("programs.title")}</FieldLabel>
            <Input
              autoFocus
              id="new-program-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("programs.titlePlaceholder")}
              value={title}
            />
          </Field>
          <DialogFooter>
            <Button onClick={close} type="button" variant="secondary">
              {t("programs.cancel")}
            </Button>
            <Button data-testid="create-program" disabled={!title.trim() || createMutation.isPending} type="submit">
              {t("programs.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
