import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { QuickAdd } from '@/components/layout/QuickAdd';
import { ShortcutsHelp } from '@/components/layout/ShortcutsHelp';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { FocusMode } from '@/components/focus/FocusMode';
import { BulkBar } from '@/components/tasks/BulkBar';
import { Skeleton } from '@/components/ui/primitives';
import { Toaster } from '@/components/ui/Toaster';
import { useAutoBackup, useConnectivityToasts, useReminders } from '@/hooks/useBackground';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTheme } from '@/hooks/useTheme';
import AllTasks from '@/pages/AllTasks';
import Analytics from '@/pages/Analytics';
import ArchivePage from '@/pages/Archive';
import ChecklistDetail from '@/pages/ChecklistDetail';
import Checklists from '@/pages/Checklists';
import Dashboard from '@/pages/Dashboard';
import Matrix from '@/pages/Matrix';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/Settings';
import Templates from '@/pages/Templates';
import { useData } from '@/store/useData';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function BootSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your checklists">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );
}

function StorageError({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-card border border-critical/40 bg-critical/8 p-5">
      <h1 className="flex items-center gap-2 font-display text-lg text-limestone">
        <AlertTriangle size={18} className="text-critical" />
        Storage is unavailable
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-steel">{message}</p>
      <p className="mt-3 text-sm leading-relaxed text-steel">
        Private or incognito windows often block IndexedDB. Open the app in a normal window, or allow
        site data for this origin, and reload.
      </p>
    </div>
  );
}

function Shell() {
  const ready = useData((state) => state.ready);
  const error = useData((state) => state.error);
  const load = useData((state) => state.load);

  useTheme();
  useShortcuts();
  useReminders();
  useAutoBackup();
  useConnectivityToasts();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 sm:px-6 lg:pb-10"
        >
          <div className="mx-auto w-full max-w-[84rem]">
            {error ? (
              <StorageError message={error} />
            ) : !ready ? (
              <BootSkeleton />
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/checklists" element={<Checklists />} />
                <Route path="/checklists/:id" element={<ChecklistDetail />} />
                <Route path="/tasks" element={<AllTasks />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/matrix" element={<Matrix />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </div>
        </main>
      </div>

      <BottomNav />
      <BulkBar />
      <Toaster />
      {ready && !error ? (
        <>
          <CommandPalette />
          <QuickAdd />
          <ShortcutsHelp />
          <FocusMode />
        </>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-control focus:bg-copper focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Shell />
    </HashRouter>
  );
}
