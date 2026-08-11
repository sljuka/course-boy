import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";

import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";
import { TestEditorPrototype } from "@/components/test-editor-prototype";
import { TestEditorTagManager } from "@/components/test-editor-tag-manager";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import { normalizeDraftTestData } from "@/components/test-editor-prototype-logic";
import {
  Accordion,
} from "@/components/ui/accordion";
import {
  AccordionCardContent,
  AccordionCardHeader,
  AccordionCardItem,
} from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import { courseRootId } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type {
  ContentRating,
  CourseLayoutOutletContext,
} from "@/components/course-layout";
import type { CourseDetails, CourseSummary } from "@/lib/course-package";
import {
  createCourseTagDefinition,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { queryClient } from "@/lib/query-client";
import { useTranslation } from "react-i18next";

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizeSupportedLocales(nextLocales: string[], fallback: Locale): Locale[] {
  const localeSet = new Set<Locale>();

  for (const locale of nextLocales) {
    if (isLocale(locale)) {
      localeSet.add(locale);
    }
  }

  if (localeSet.size === 0) {
    localeSet.add(fallback);
  }

  return locales.filter((locale) => localeSet.has(locale));
}

function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
}

function getContentRatingLabel(contentRating: ContentRating) {
  switch (contentRating) {
    case "all-ages":
      return "All ages";
    case "mature-themes":
      return "Contains mature themes";
    case "explicit":
      return "Explicit";
  }
}

function buildPersistedDraftSnapshot({
  contentRating,
  courseDescription,
  courseId,
  courseTitle,
  descriptiveTags,
  documentDrafts,
  supportedLocales,
  testDrafts,
}: {
  contentRating: ContentRating;
  courseDescription: string;
  courseId: string;
  courseTitle: string;
  descriptiveTags: CourseTagDefinition[];
  documentDrafts: Record<string, { subtitle: string; title: string }>;
  supportedLocales: Locale[];
  testDrafts: Record<string, TestEditorState>;
}) {
  const persistedDescriptiveTags = descriptiveTags.filter(
    (tag) => normalizeCourseTagLabel(tag.label).length > 0,
  );
  const persistedTagIds = new Set(persistedDescriptiveTags.map((tag) => tag.id));
  const persistedTestDrafts = Object.fromEntries(
    Object.entries(testDrafts).map(([draftId, draftState]) => [
      draftId,
      {
        ...draftState,
        blueprint: draftState.blueprint.filter((rule) => persistedTagIds.has(rule.tagId)),
        exercises: draftState.exercises.map((exercise) => ({
          ...exercise,
          tagIds: exercise.tagIds.filter((tagId) => persistedTagIds.has(tagId)),
        })),
      },
    ]),
  ) satisfies Record<string, TestEditorState>;

  return {
    contentRating,
    courseDescription,
    courseId,
    courseTitle,
    descriptiveTags: persistedDescriptiveTags,
    documentDrafts,
    supportedLocales,
    testDrafts: persistedTestDrafts,
    version: 1 as const,
  };
}

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const courseTitleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    contentRating,
    courseDescription,
    courseTitle,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
    selectedNode,
    setContentRating,
    setCourseDescription,
    setCourseTitle,
    setDraftSnapshot,
    setEditorStatusAction,
    setSelectedNode,
    setSupportedLocales,
    supportedLocales,
  } = useOutletContext<CourseLayoutOutletContext>();
  const [documentDrafts, setDocumentDrafts] = useState<
    Record<string, { subtitle: string; title: string }>
  >({});
  const [descriptiveTags, setDescriptiveTags] = useState<CourseTagDefinition[]>([]);
  const [testDrafts, setTestDrafts] = useState<Record<string, TestEditorState>>({});
  const [hasHydratedLocalDrafts, setHasHydratedLocalDrafts] = useState(false);
  const shouldAutoFocusCourseTitle =
    (location.state as { focusCourseTitle?: boolean } | null)?.focusCourseTitle ===
    true;
  const serializedDraftSnapshot = useMemo(
    () =>
      courseId && initialDraftSnapshotLoaded && hasHydratedLocalDrafts
        ? JSON.stringify(
            buildPersistedDraftSnapshot({
              contentRating,
              courseDescription,
              courseId,
              courseTitle,
              descriptiveTags,
              documentDrafts,
              supportedLocales,
              testDrafts,
            }),
          )
        : null,
    [
      contentRating,
      courseDescription,
      courseId,
      descriptiveTags,
      courseTitle,
      documentDrafts,
      hasHydratedLocalDrafts,
      initialDraftSnapshotLoaded,
      supportedLocales,
      testDrafts,
    ],
  );

  useEffect(() => {
    setEditorStatusAction(null);
  }, [setEditorStatusAction]);

  useEffect(() => {
    if (!initialDraftSnapshotLoaded || hasHydratedLocalDrafts) {
      return;
    }

    const normalizedDraftTests = normalizeDraftTestData(
      initialDraftSnapshot?.testDrafts ?? {},
      initialDraftSnapshot?.descriptiveTags,
    );

    setDescriptiveTags(normalizedDraftTests.descriptiveTags);
    setDocumentDrafts(initialDraftSnapshot?.documentDrafts ?? {});
    setTestDrafts(normalizedDraftTests.testDrafts);
    setHasHydratedLocalDrafts(true);
  }, [hasHydratedLocalDrafts, initialDraftSnapshot, initialDraftSnapshotLoaded]);

  useEffect(() => {
    if (!shouldAutoFocusCourseTitle || selectedNode.id !== courseRootId) {
      return;
    }

    courseTitleRef.current?.focus();
    courseTitleRef.current?.select();
  }, [selectedNode.id, shouldAutoFocusCourseTitle]);

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [courseDescription]);

  useEffect(() => {
    if (!serializedDraftSnapshot) {
      return;
    }

    setDraftSnapshot(JSON.parse(serializedDraftSnapshot));
  }, [serializedDraftSnapshot, setDraftSnapshot]);

  useEffect(() => {
    if (!courseId || !hasHydratedLocalDrafts) {
      return;
    }

    queryClient.setQueriesData<CourseSummary[] | undefined>(
      { queryKey: ["courses", "list"] },
      (currentCourses) => {
        if (!currentCourses) {
          return currentCourses;
        }

        return currentCourses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                contentRating,
                description: courseDescription,
                supportedLocales,
                title: courseTitle || "Course",
              }
            : course,
        );
      },
    );

    queryClient.setQueriesData<CourseDetails | null | undefined>(
      { queryKey: ["courses", "detail", courseId] },
      (currentCourse) => {
        if (!currentCourse) {
          return currentCourse;
        }

        return {
          ...currentCourse,
          contentRating,
          description: courseDescription,
          supportedLocales,
          title: courseTitle || "Course",
        };
      },
    );
  }, [
    contentRating,
    courseDescription,
    courseId,
    courseTitle,
    hasHydratedLocalDrafts,
    supportedLocales,
  ]);

  const handleTestStateChange = useCallback(
    (state: TestEditorState) => {
      setTestDrafts((currentDrafts) => {
        if (currentDrafts[selectedNode.id] === state) {
          return currentDrafts;
        }

        return {
          ...currentDrafts,
          [selectedNode.id]: state,
        };
      });
    },
    [selectedNode.id],
  );

  function updateDescriptiveTag(tagId: string, patch: Partial<CourseTagDefinition>) {
    setDescriptiveTags((currentTags) =>
      currentTags.map((tag) => {
        if (tag.id !== tagId) {
          return tag;
        }

        return {
          ...tag,
          ...patch,
          label:
            typeof patch.label === "string"
              ? normalizeCourseTagLabel(patch.label)
              : tag.label,
        };
      }),
    );
  }

  function createDescriptiveTag() {
    let nextTagId = "";

    setDescriptiveTags((currentTags) => {
      const nextTag = createCourseTagDefinition("", "sky", currentTags);
      nextTagId = nextTag.id;

      return [...currentTags, nextTag];
    });

    return nextTagId;
  }

  function deleteDescriptiveTag(tagId: string) {
    const remainingTags = descriptiveTags.filter((tag) => tag.id !== tagId);

    setDescriptiveTags(remainingTags);
    setTestDrafts((currentDrafts) =>
      Object.fromEntries(
        Object.entries(currentDrafts).map(([draftId, draftState]) => [
          draftId,
          {
            ...draftState,
            blueprint: draftState.blueprint.map((rule) => ({
              ...rule,
              tagId: rule.tagId === tagId ? (remainingTags[0]?.id ?? "") : rule.tagId,
            })),
            exercises: draftState.exercises.map((exercise) => ({
              ...exercise,
              tagIds: exercise.tagIds.filter((currentTagId) => currentTagId !== tagId),
            })),
          },
        ]),
      ),
    );
  }

  if (!courseId) {
    return <Navigate replace to="/drafts" />;
  }

  if (!initialDraftSnapshotLoaded || !hasHydratedLocalDrafts) {
    return <div className="h-full p-4 sm:p-5 lg:p-6" />;
  }

  if (selectedNode.id === courseRootId) {
    return (
      <div className="h-full p-4 sm:p-5 lg:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Eyebrow>Course</Eyebrow>
              <Input
                className="h-auto border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-3xl"
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Course"
                ref={courseTitleRef}
                value={courseTitle}
              />
              <Textarea
                className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-base font-medium text-stone-600 shadow-none placeholder:text-stone-400 focus-visible:ring-0 md:text-base"
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="Add a short course description"
                ref={descriptionRef}
                rows={1}
                value={courseDescription}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Eyebrow size="small">Supported locales</Eyebrow>
                <Badge variant="secondary">{supportedLocales.length}</Badge>
              </div>
              <Combobox
                items={locales}
                multiple
                onValueChange={(nextLocales) =>
                  setSupportedLocales(
                    normalizeSupportedLocales(
                      nextLocales as string[],
                      i18n.language as Locale,
                    ),
                  )
                }
                value={supportedLocales}
              >
                <ComboboxChips ref={supportedLocalesAnchor}>
                  <ComboboxValue>
                    {supportedLocales.map((locale) => (
                      <ComboboxChip key={locale} showRemove>
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput
                    className="min-h-8"
                    placeholder="Add supported locales"
                  />
                </ComboboxChips>
                <ComboboxContent anchor={supportedLocalesAnchor}>
                  <ComboboxEmpty>No locales found.</ComboboxEmpty>
                  <ComboboxList>
                    {locales.map((locale) => (
                      <ComboboxItem key={locale} value={locale}>
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <div className="flex flex-col gap-3">
                <Eyebrow size="small">Content rating</Eyebrow>
                <Select
                  onValueChange={(value) => setContentRating(value as ContentRating)}
                  value={contentRating}
                >
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue>
                      {getContentRatingLabel(contentRating)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ages">All ages</SelectItem>
                    <SelectItem value="mature-themes">
                      Contains mature themes
                    </SelectItem>
                    <SelectItem value="explicit">Explicit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Accordion>
                <AccordionCardItem value="descriptive-tags">
                  <AccordionCardHeader
                    bodyClassName="flex min-w-0 flex-col gap-2"
                    value="descriptive-tags"
                  >
                    <div className="flex flex-col gap-2">
                      <Eyebrow size="small">Descriptive tags</Eyebrow>
                      <CardDescription>
                        Define the course tag types once, then reuse them across
                        exercises.
                      </CardDescription>
                    </div>
                  </AccordionCardHeader>
                  <AccordionCardContent>
                    <TestEditorTagManager
                      hideHeader
                      onCreateTag={createDescriptiveTag}
                      onDeleteTag={deleteDescriptiveTag}
                      onUpdateTag={updateDescriptiveTag}
                      tags={descriptiveTags}
                      unstyled
                    />
                  </AccordionCardContent>
                </AccordionCardItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedNode.type === "test") {
    return (
      <TestEditorPrototype
        descriptiveTags={descriptiveTags}
        initialState={testDrafts[selectedNode.id]}
        initialTitle={selectedNode.title}
        onStateChange={handleTestStateChange}
        supportedLocales={supportedLocales}
      />
    );
  }

  const activeDocumentDraft = documentDrafts[selectedNode.id] ?? {
    subtitle: "",
    title: selectedNode.title,
  };

  return (
    <div className="h-full p-4 sm:p-5 lg:p-6">
      <EditorPrototype
        nodeType={selectedNode.type}
        onSubtitleChange={(subtitle) =>
          setDocumentDrafts((currentDrafts) => ({
            ...currentDrafts,
            [selectedNode.id]: {
              ...activeDocumentDraft,
              subtitle,
            },
          }))
        }
        onTitleChange={(title) => {
          setDocumentDrafts((currentDrafts) => ({
            ...currentDrafts,
            [selectedNode.id]: {
              ...activeDocumentDraft,
              title,
            },
          }));
          setSelectedNode({
            ...selectedNode,
            title,
          });
        }}
        subtitle={activeDocumentDraft.subtitle}
        title={activeDocumentDraft.title}
      />
    </div>
  );
}
