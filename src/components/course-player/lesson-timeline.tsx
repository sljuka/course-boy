import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Timeline,
  TimelineFill,
  TimelinePoint,
  TimelinePointImage,
  TimelinePointName,
  TimelinePointYear,
  TimelineRange,
  TimelineStem,
  TimelineStrip,
  TimelineTick,
  TimelineTickMark,
  TimelineTrack,
} from "@/components/ui/timeline";
import { TIMELINE_ICON_COMPONENTS } from "@/components/course-player/timeline-icons";
import { matkoAssetUrl } from "@/lib/course-assets";
import {
  layoutTimeline,
  readingLine,
  readingProgress,
  type TimelineMarker,
  timelineDateText,
  timelineOffset,
  timelinePosition,
  timelineYearText,
  visiblePointYears,
} from "@/lib/lesson-timeline";

// The selector of a timeline point's place in the lesson: the empty element
// the `timeline` block renders for students (see timeline-block.tsx).
export const TIMELINE_MARKER_SELECTOR = "[data-timeline-marker]";


// A row of points: the point (centred 20px down), its year under it.
const ROW_HEIGHT = 62;
const TOP = 8;

// The bar at the top of a lesson with timeline points (SLJ-35). It follows the
// reading: as each point's place in the text scrolls up under the bar, the
// bar's "now" moves to it, sliding between points in step with the scroll,
// and a bar longer than the window slides along to keep "now" in view.
// Close points go up a row. A point opens its place in the lesson. `contentRef` holds the lesson's
// rendered blocks, where the points' places are, in the same order as
// `markers`.
export function LessonTimeline({
  contentRef,
  courseId,
  markers,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  courseId: string;
  markers: TimelineMarker[];
}) {
  const { t } = useTranslation();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(-1);
  const [viewport, setViewport] = useState(0);
  const layout = useMemo(() => layoutTimeline(markers, viewport), [markers, viewport]);

  // The bar's width decides how far it stretches.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => setViewport(bar.clientWidth));
    observer.observe(bar);
    setViewport(bar.clientWidth);
    return () => observer.disconnect();
  }, []);
  const bce = (year: number) => t("lessonTimeline.yearBce", { year });

  useEffect(() => {
    let frame = 0;
    // While the student scrolls down the bar only moves forward: a picture
    // loading further down makes the page longer, which moves the reading
    // line back up in the lesson's last screen.
    let lastScrollTop = 0;

    function measure() {
      frame = 0;
      const bar = barRef.current;
      const content = contentRef.current;
      if (!bar || !content) return;
      const places = [...content.querySelectorAll<HTMLElement>(TIMELINE_MARKER_SELECTOR)];
      const next = readingProgress(places.map((place) => place.getBoundingClientRect().top), currentLine(bar));
      const scrollTop = scrollParent(bar)?.scrollTop ?? 0;
      const scrollingDown = scrollTop > lastScrollTop;
      lastScrollTop = scrollTop;
      setProgress((previous) => (scrollingDown ? Math.max(previous, next) : next));
    }

    function schedule() {
      if (frame === 0) frame = requestAnimationFrame(measure);
    }

    measure();
    // Scroll events don't bubble; capturing them on the document hears
    // whichever element scrolls the lesson.
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [contentRef, markers]);

  function goTo(index: number) {
    const place = contentRef.current?.querySelectorAll<HTMLElement>(TIMELINE_MARKER_SELECTOR)[index];
    const bar = barRef.current;
    if (!place || !bar) return;
    // Lands just above the reading line, where it counts as reached.
    const { top } = visibleText(bar);
    const line = readingLine({ ...visibleText(bar), remaining: Infinity });
    place.style.scrollMarginTop = `${line - top + bar.offsetHeight - 8}px`;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    place.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const active = progress < 0 ? -1 : Math.floor(progress);
  const showYear = visiblePointYears(layout.points, active);
  const now = timelinePosition(layout, progress);
  const rowTop = (row: number) => TOP + (layout.rows - 1 - row) * ROW_HEIGHT;
  const trackY = TOP + layout.rows * ROW_HEIGHT;
  const stateOf = (index: number) => (index === active ? "active" : index < active ? "reached" : "upcoming");

  return (
    <Timeline aria-label={t("lessonTimeline.barLabel")} data-testid="lesson-timeline" ref={barRef}>
      <TimelineStrip height={trackY + 30} offset={timelineOffset(layout, now, viewport, layout.points[active]?.x)} width={layout.width}>
        <TimelineTrack y={trackY}>
          {layout.points.map((point, index) =>
            point.end === null ? null : <TimelineRange end={point.end} key={index} start={point.x} />,
          )}
          <TimelineFill x={progress < 0 ? 0 : now} />
        </TimelineTrack>
        {layout.ticks.map((tick) => (
          <TimelineTickMark key={`mark-${tick.year}`} labelled={tick.label} x={tick.x} y={trackY + 5} />
        ))}
        {layout.ticks.map((tick) =>
          tick.label ? (
            <TimelineTick key={tick.year} x={tick.x} y={trackY + 12}>
              {timelineYearText(tick.year, bce)}
            </TimelineTick>
          ) : null,
        )}
        {layout.points.map((point, index) => (
          <TimelineStem
            height={trackY - rowTop(point.row) - 20}
            key={`stem-${index}`}
            reached={index <= active}
            x={point.x}
            y={rowTop(point.row) + 20}
          />
        ))}
        {markers.map((marker, index) => {
          const point = layout.points[index];
          const label = marker.label || t("lessonTimeline.untitled");
          return (
            <TimelinePoint
              aria-current={index === active ? "step" : undefined}
              aria-label={t("lessonTimeline.goTo", { label })}
              data-testid="lesson-timeline-point"
              key={index}
              kind={marker.image ? "picture" : marker.icon ? "icon" : "dot"}
              onClick={() => goTo(index)}
              state={stateOf(index)}
              title={[timelineDateText(marker, bce), label].filter(Boolean).join(" · ")}
              x={point.x}
              y={rowTop(point.row) + 20}
            >
              {marker.image ? (
                <TimelinePointImage alt={marker.imageAlt ?? ""} src={matkoAssetUrl(courseId, marker.image)} />
              ) : (
                marker.icon && <TimelinePointIcon icon={marker.icon} />
              )}
            </TimelinePoint>
          );
        })}
        {markers.map((marker, index) => {
          if (!showYear[index] || (marker.year === undefined && index !== active)) return null;
          const point = layout.points[index];
          // The year it starts (a reign's first year); the current point's name too.
          return (
            <TimelinePointYear
              aria-live={index === active ? "polite" : undefined}
              data-testid={index === active ? "lesson-timeline-current" : "lesson-timeline-point-year"}
              key={`year-${index}`}
              state={stateOf(index)}
              x={point.x}
              y={rowTop(point.row) + 44}
            >
              {marker.year !== undefined && timelineYearText(marker.year, bce)}
              {index === active && <TimelinePointName>{marker.label || t("lessonTimeline.untitled")}</TimelinePointName>}
            </TimelinePointYear>
          );
        })}
      </TimelineStrip>
    </Timeline>
  );
}

// The text visible under the bar, from the top of the window, and how much
// more the lesson can scroll.
function visibleText(bar: HTMLElement): { bottom: number; remaining: number; top: number } {
  const scroller = scrollParent(bar);
  const bottom = scroller && scroller !== document.scrollingElement ? scroller.getBoundingClientRect().bottom : window.innerHeight;
  const remaining = scroller ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight : 0;
  return { bottom, remaining, top: bar.getBoundingClientRect().bottom };
}

function currentLine(bar: HTMLElement): number {
  return readingLine(visibleText(bar));
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return document.scrollingElement as HTMLElement | null;
}

function TimelinePointIcon({ icon }: { icon: NonNullable<TimelineMarker["icon"]> }) {
  const Icon = TIMELINE_ICON_COMPONENTS[icon];
  return <Icon aria-hidden="true" />;
}
