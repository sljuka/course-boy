export function PrintDocumentHeader({
  courseTitle,
  label,
  show,
  sectionTitle,
  title,
}: {
  courseTitle: string;
  label: string;
  show?: boolean;
  sectionTitle: string;
  title: string;
}) {
  if (show === false) {
    return null;
  }

  return (
    <header className="mb-5 hidden border-b border-stone-300 pb-3 print:block">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {courseTitle}
      </h1>
      <div className="mt-0.5 text-xs text-muted-foreground">{sectionTitle}</div>
      <div className="mt-2 text-base font-medium text-foreground">{title}</div>
    </header>
  );
}
