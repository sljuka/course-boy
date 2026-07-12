import { Outlet } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAppState } from "@/lib/use-app-state";

export const HeaderLayout = () => {
  const { locale, setLocale } = useAppState();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="relative z-40 border-b border-stone-300/90 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-6 py-3">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
          <AppMenu />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-8">
        <Outlet />
      </div>
    </main>
  );
};
