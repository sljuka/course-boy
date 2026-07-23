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
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </div>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950">
        {courseTitle}
      </h1>
      <div className="mt-0.5 text-xs text-stone-600">{sectionTitle}</div>
      <div className="mt-2 text-base font-medium text-stone-900">{title}</div>
    </header>
  );
}
