import { PageContent } from "@/components/page-content";

type PlaceholderPageProps = {
  description: string;
  title: string;
};

function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <PageContent>
      <div className="rounded-3xl border border-stone-300/80 bg-white/75 p-8 shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Matko
          </p>
          <h1 className="text-3xl font-semibold text-stone-950">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>
      </div>
    </PageContent>
  );
}

export { PlaceholderPage };
