import { Ellipsis, Eye, Globe, ImagePlus, Library, Radio, Share2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppStatusBarEnd } from "@/components/app-frame/app-status-bar-end";
import { ChannelContentsEditor } from "@/components/channels/channel-contents-editor";
import { LocalesTabs } from "@/components/locales-tabs";
import { Page } from "@/components/page/page";
import { ProgramCoursesEditor } from "@/components/programs/program-courses-editor";
import { ProgramCodeDialog } from "@/components/programs/program-code";
import { ProgramThemeEditor } from "@/components/programs/program-theme-editor";
import { usePublishProgram } from "@/components/programs/use-publish-program";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CoverBanner, CoverLogo } from "@/components/ui/cover-banner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EditorStatusBar } from "@/components/ui/editor-status-bar";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { locales as appLocales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import type { ProgramManifest } from "@/lib/program-package";
import {
  programAssetUrl,
  useProgramQuery,
  useProgramSharingQuery,
  useRemoveProgramMutation,
  useUpdateProgramMutation,
} from "@/lib/program-queries";
import { useEntityAutosave } from "@/lib/use-entity-autosave";

// The editor for one of your programs (SLJ-32): its header (banner, logo),
// languages, title and description per language, colors and courses. Saves
// itself a few seconds after each change, like the course editor. Your
// channel (SLJ-31) is edited here too (My channel): named rather than titled,
// its courses chosen on each course ("Show on my channel"), its programs
// ticked, and never removed.
export function ProgramEditorPage() {
  const { programId } = useParams();
  const { data: program, error } = useProgramQuery(programId);
  const { t } = useTranslation();

  if (error) {
    return (
      <Page breadcrumbs={[{ icon: Library, label: t("sidebar.myPrograms"), to: "/my-programs" }]}>
        <CardDescription>{t("programs.loadError")}</CardDescription>
      </Page>
    );
  }
  if (!program) return null;

  // Remounted per program, so its state starts from that program.
  return <ProgramEditor initial={program} key={program.id} />;
}

export function ProgramEditor({ initial }: { initial: ProgramManifest }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [seed] = useState(initial);
  const [program, setProgram] = useState(initial);
  const [activeLocale, setActiveLocale] = useState<Locale>(initial.defaultLocale);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const updateMutation = useUpdateProgramMutation();
  const removeMutation = useRemoveProgramMutation();

  const buildInput = useCallback((value: ProgramManifest) => value, []);
  const autosave = useEntityAutosave({ buildInput, initialValue: seed, mutation: updateMutation, value: program });
  const update = (change: Partial<ProgramManifest>) => setProgram((current) => ({ ...current, ...change }));
  const { data: sharing } = useProgramSharingQuery(program.id);
  const publishing = usePublishProgram(program.id);
  const [isSharing, setIsSharing] = useState(false);
  // Publish goes out once the latest edit is saved, so what goes online is
  // what's on screen.
  const [isPublishRequested, setIsPublishRequested] = useState(false);

  useEffect(() => {
    if (!isPublishRequested) return;
    if (autosave.status === "saved") {
      setIsPublishRequested(false);
      publishing.requestPublish();
    } else if (autosave.status === "error") {
      setIsPublishRequested(false);
    }
  }, [autosave.status, isPublishRequested, publishing]);

  function handlePublish() {
    autosave.saveNow();
    setIsPublishRequested(true);
  }

  async function pickImage(field: "banner" | "logo") {
    const result = await window.programs.uploadImage(program.id);
    if (result) update({ [field]: result.filename });
  }

  function setLanguage(locale: Locale, enabled: boolean) {
    setProgram((current) => {
      const supportedLocales = enabled
        ? appLocales.filter((candidate) => candidate === locale || current.supportedLocales.includes(candidate))
        : current.supportedLocales.filter((candidate) => candidate !== locale);
      if (supportedLocales.length === 0) return current;
      const programLocales = { ...current.locales };
      if (enabled) programLocales[locale] ??= { description: "", title: "" };
      else delete programLocales[locale];
      const defaultLocale = supportedLocales.includes(current.defaultLocale) ? current.defaultLocale : supportedLocales[0];
      programLocales[defaultLocale] ??= { description: "", title: "" };
      return { ...current, defaultLocale, locales: programLocales, supportedLocales };
    });
    if (!enabled && activeLocale === locale) setActiveLocale(program.defaultLocale);
  }

  function setLocalized(locale: Locale, field: "description" | "title", value: string) {
    setProgram((current) => ({
      ...current,
      locales: {
        ...current.locales,
        [locale]: { description: "", title: "", ...current.locales[locale], [field]: value },
      },
    }));
  }

  const isChannel = program.kind === "channel";
  const title =
    program.locales[program.defaultLocale]?.title || (isChannel ? t("channels.untitled") : t("programs.untitled"));

  return (
    <Page
      actions={
        <>
          <Button
            data-testid="program-preview"
            nativeButton={false}
            render={<Link to={isChannel ? `/channels/${program.id}` : `/programs/${program.id}`} />}
            size="sm"
            title={t("programs.preview")}
            variant="secondary"
          >
            <Eye aria-hidden="true" />
            <ButtonLabel>{t("programs.preview")}</ButtonLabel>
          </Button>
          <Button
            data-testid="program-publish"
            disabled={isPublishRequested || publishing.isPublishing}
            onClick={handlePublish}
            size="sm"
            title={t("programSharing.publishHint")}
          >
            <Globe aria-hidden="true" />
            <ButtonLabel>{t("programSharing.publish")}</ButtonLabel>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button aria-label={t("programs.actions")} shape="circle" size="icon-sm" variant="subtle" />
              }
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sharing?.code && (
                <DropdownMenuItem data-testid="program-share" onClick={() => setIsSharing(true)}>
                  <Share2 aria-hidden="true" />
                  {t("programSharing.share")}
                </DropdownMenuItem>
              )}
              {!isChannel && (
                <DropdownMenuItem onClick={() => setIsConfirmingRemove(true)} variant="destructive">
                  <Trash2 aria-hidden="true" />
                  {t("programs.remove")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      breadcrumbs={
        isChannel
          ? [{ icon: Radio, label: t("sidebar.myChannel") }]
          : [
              { icon: Library, label: t("sidebar.myPrograms"), to: "/my-programs" },
              { icon: Library, label: title },
            ]
      }
    >
      <div className="flex flex-col gap-4" data-testid="program-editor">
        {publishing.error && (
          <Alert variant="destructive">
            <AlertTitle>{t("programSharing.publishFailed")}</AlertTitle>
            <AlertDescription>{publishing.error.message}</AlertDescription>
          </Alert>
        )}
        {/* The header as students see it: banner, and the logo over its edge. */}
        <div className="flex flex-col">
          <CoverBanner src={program.banner ? programAssetUrl(program.id, program.banner) : null} />
          <div className="flex flex-wrap items-end gap-4 px-6">
            <CoverLogo className="-mt-12">
              {program.logo ? (
                <img alt="" src={programAssetUrl(program.id, program.logo)} />
              ) : (
                <Library aria-hidden="true" className="size-10!" />
              )}
            </CoverLogo>
            <div className="flex flex-wrap gap-2 pb-1">
              <Button data-testid="program-pick-banner" onClick={() => void pickImage("banner")} size="sm" variant="secondary">
                <ImagePlus aria-hidden="true" />
                {program.banner ? t("programs.changeBanner") : t("programs.addBanner")}
              </Button>
              {program.banner && (
                <Button onClick={() => update({ banner: null })} size="sm" variant="ghost">
                  <X aria-hidden="true" />
                  {t("programs.removeBanner")}
                </Button>
              )}
              <Button data-testid="program-pick-logo" onClick={() => void pickImage("logo")} size="sm" variant="secondary">
                <ImagePlus aria-hidden="true" />
                {program.logo ? t("programs.changeLogo") : t("programs.addLogo")}
              </Button>
              {program.logo && (
                <Button onClick={() => update({ logo: null })} size="sm" variant="ghost">
                  <X aria-hidden="true" />
                  {t("programs.removeLogo")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <FieldSet>
          <FieldLegend>{t("programs.languages")}</FieldLegend>
          <div className="flex flex-wrap gap-4">
            {appLocales.map((locale) => (
              <Label key={locale}>
                <Checkbox
                  checked={program.supportedLocales.includes(locale)}
                  disabled={program.supportedLocales.length === 1 && program.supportedLocales.includes(locale)}
                  onCheckedChange={(checked) => setLanguage(locale, checked === true)}
                />
                {getLocaleFlag(locale)} {t(`programs.language.${locale}`)}
              </Label>
            ))}
          </div>
        </FieldSet>

        <LocalesTabs
          activeLocale={program.supportedLocales.includes(activeLocale) ? activeLocale : program.defaultLocale}
          locales={program.supportedLocales}
          onActiveLocaleChange={setActiveLocale}
          renderContent={(locale) => (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`program-title-${locale}`}>
                  {isChannel ? t("channels.name") : t("programs.title")}
                </FieldLabel>
                <Input
                  data-testid={`program-title-${locale}`}
                  id={`program-title-${locale}`}
                  onChange={(event) => setLocalized(locale, "title", event.target.value)}
                  placeholder={isChannel ? t("channels.namePlaceholder") : t("programs.titlePlaceholder")}
                  value={program.locales[locale]?.title ?? ""}
                />
                {isChannel && <FieldDescription>{t("channels.nameHint")}</FieldDescription>}
              </Field>
              <Field>
                <FieldLabel htmlFor={`program-description-${locale}`}>{t("programs.description")}</FieldLabel>
                <Textarea
                  id={`program-description-${locale}`}
                  onChange={(event) => setLocalized(locale, "description", event.target.value)}
                  placeholder={t("programs.descriptionPlaceholder")}
                  rows={3}
                  value={program.locales[locale]?.description ?? ""}
                />
              </Field>
            </FieldGroup>
          )}
        />

        <ProgramThemeEditor onChange={(theme) => update({ theme })} theme={program.theme} />

        {isChannel ? (
          <ChannelContentsEditor
            channelId={program.id}
            locale={activeLocale}
            onProgramsChange={(programs) => update({ programs })}
            programs={program.programs ?? []}
          />
        ) : (
          <ProgramCoursesEditor
            courses={program.courses}
            locale={activeLocale}
            onChange={(courses) => update({ courses })}
          />
        )}
      </div>

      <AppStatusBarEnd>
        <EditorStatusBar
          message={
            autosave.status === "error"
              ? (autosave.errorMessage ?? t("editorStatus.saveFailed"))
              : autosave.status === "saving"
                ? t("editorStatus.saving")
                : autosave.status === "dirty"
                  ? t("editorStatus.savingSoon")
                  : t("editorStatus.saved")
          }
          onRetry={autosave.saveNow}
          retryLabel={t("editorStatus.retry")}
          status={autosave.status}
        />
      </AppStatusBarEnd>

      {publishing.dialogs}
      <ProgramCodeDialog
        description={t("programSharing.shareDescription")}
        onClose={() => setIsSharing(false)}
        open={isSharing}
        programId={program.id}
        title={t("programSharing.share")}
      />

      <Dialog onOpenChange={(open) => !open && setIsConfirmingRemove(false)} open={isConfirmingRemove}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{t("programs.removeTitle", { title })}</DialogTitle>
            <DialogDescription>{t("programs.removeDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsConfirmingRemove(false)} variant="secondary">
              {t("programs.cancel")}
            </Button>
            <Button
              data-testid="confirm-remove-program"
              disabled={removeMutation.isPending}
              onClick={() =>
                removeMutation.mutate(program.id, { onSuccess: () => navigate("/my-programs") })
              }
              variant="destructive"
            >
              {t("programs.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
