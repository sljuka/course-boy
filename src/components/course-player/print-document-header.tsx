export function PrintDocumentHeader({
  courseTitle,
  description,
  label,
  show,
  sectionTitle,
  title,
}: {
  courseTitle: string;
  description?: string;
  label: string;
  show?: boolean;
  sectionTitle: string;
  title: string;
}) {
  if (show === false) {
    return null;
  }

  // "Course Name / Section 1 / Test 1" — one quiet line instead of the
  // course title as its own oversized heading; the course name still shows
  // (a stack of printouts from several courses stays distinguishable), just
  // no longer the visual focus of the page. sectionTitle is empty for a
  // standalone test (no section) and for the draft editor's preview (a
  // synthetic single-step player with no real section) — filtered out
  // rather than left as a stray double "/".
  const headerLine = [courseTitle, sectionTitle, title].filter(Boolean).join(" / ");

  return (
    <header className="mb-4 hidden border-b border-stone-300 pb-2 print:block">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-foreground">{headerLine}</div>
      {description && (
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      )}
    </header>
  );
}
