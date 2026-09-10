import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MyWorkView } from './components/tasks/MyWorkView';
import { WaitingForView } from './components/tasks/WaitingForView';
import { CompletedView } from './components/tasks/CompletedView';
import { TeamView } from './components/team/TeamView';
import { SettingsView } from './components/settings/SettingsView';
import { CreateTaskModal } from './components/tasks/CreateTaskModal';
import { TaskDetailDrawer } from './components/tasks/TaskDetailDrawer';
import { AuthOnboardingModal } from './components/auth/AuthOnboardingModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { PendingRequestsModal } from './components/team/PendingRequestsModal';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts } = useTaskContext();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-3.5 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toast.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-700'
              : 'bg-indigo-900 text-white border-indigo-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
          ) : (
            <Bell className="w-5 h-5 text-indigo-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab } = useTaskContext();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500/20">
      {/* Top Navbar */}
      <Navbar onOpenOnboarding={() => setIsOnboardingOpen(true)} />

      {/* Workspace Content Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Main View */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {activeTab === 'my_work' && <MyWorkView />}
          {activeTab === 'waiting_for' && <WaitingForView />}
          {activeTab === 'completed' && <CompletedView />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Global Modals & Drawers */}
      <CreateTaskModal />
      <TaskDetailDrawer />
      <GoogleAuthModal />
      <PendingRequestsModal />
      <AuthOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TaskProvider>
      <MainContent />
    </TaskProvider>
  );
}
