import { Outlet } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RoleGuard } from "@/components/role-guard";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAppState } from "@/lib/use-app-state";

export const HeaderLayout = () => {
  const { locale, setLocale } = useAppState();

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-stone-100">
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-4">
            <div className="flex min-w-0 items-center gap-4">
              <RoleGuard roles="teacher">
                <SidebarTrigger className="h-8 w-8 rounded-md" />
              </RoleGuard>
              <div className="hidden h-5 w-px bg-stone-200 sm:block" />
              <h1 className="truncate text-base font-bold text-stone-950">
                Matkoslav
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
              <AppMenu />
            </div>
          </div>
        </header>
        <div className="flex min-h-[calc(100vh-4rem)] w-full gap-0">
          <RoleGuard roles="teacher">
            <AppSidebar />
          </RoleGuard>
          <SidebarInset className="min-w-0">
            <main className="min-h-[calc(100vh-4rem)] w-full rounded-bl-3xl border-l border-stone-200 bg-white shadow-[0_20px_48px_-28px_rgba(41,37,36,0.18)]">
              <div className="flex bg-white p-4">
                <div className="flex w-full items-start">
                  <Outlet />
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};
