import React, { useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { PERSONALITY_AVATARS } from '../../data/avatars';
import { Settings, RefreshCw, User, Bell, Building2, Check, Sparkles } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeUser, setActiveUser, activeOrg, resetDemoData, showToast } = useTaskContext();
  const [displayNameInput, setDisplayNameInput] = useState(activeUser?.name || '');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(
    activeUser?.avatar || PERSONALITY_AVATARS[0].url
  );

  const [notifyOnAssign, setNotifyOnAssign] = useState(true);
  const [notifyOnBlock, setNotifyOnBlock] = useState(true);
  const [notifyOnNudge, setNotifyOnNudge] = useState(true);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim() || !activeUser) return;

    setActiveUser({
      ...activeUser,
      name: displayNameInput.trim(),
      avatar: selectedAvatarUrl,
    });
    showToast('Updated your display name and personality avatar!', 'success');
  };

  const handleReset = () => {
    if (confirm('Clear all tasks, organisations, users, and local workspace data?')) {
      resetDemoData();
      alert('All local application data cleared!');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SETTINGS</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage organization configuration, personal profile, and personality avatars.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-6 text-sm">
        {/* Active Organization Card */}
        {activeOrg && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 text-base">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Active Organization Workspace</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Organization Name
                </label>
                <div className="font-bold text-slate-900 text-base bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between max-w-md">
                  <span>{activeOrg.name}</span>
                  <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
                    {activeOrg.inviteCode}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Profile & Personality Avatar Picker Card */}
        {activeUser && (
          <form onSubmit={handleProfileSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 text-base">
              <User className="w-5 h-5 text-indigo-600" />
              <span>Your Profile & Personality Avatar</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={activeUser.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

          {/* Avatar Gallery Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Personality Avatar
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              {PERSONALITY_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatarUrl(av.url)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center space-y-1 transition cursor-pointer relative ${
                    selectedAvatarUrl === av.url
                      ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/30'
                      : 'bg-white border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 bg-white"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs">{av.emoji}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center">
                    {av.name}
                  </span>

                  {selectedAvatarUrl === av.url && (
                    <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-2 shadow-2xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      )}

        {/* Notification Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-base">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>Notification Preferences</span>
          </div>

          <div className="space-y-3 text-slate-700">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 cursor-pointer font-medium">
              <span>Notify me when a new task is assigned to me</span>
              <input
                type="checkbox"
                checked={notifyOnAssign}
                onChange={(e) => setNotifyOnAssign(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 cursor-pointer font-medium">
              <span>Notify me when an assigned task is marked blocked</span>
              <input
                type="checkbox"
                checked={notifyOnBlock}
                onChange={(e) => setNotifyOnBlock(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 cursor-pointer font-medium">
              <span>Notify me when someone nudges me on a task</span>
              <input
                type="checkbox"
                checked={notifyOnNudge}
                onChange={(e) => setNotifyOnNudge(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Reset / Clear All Data Card */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-rose-800 text-base">
            <RefreshCw className="w-5 h-5 text-rose-600" />
            <span>Clear All Local Workspace Data</span>
          </div>
          <p className="text-slate-600 text-sm">
            Permanently clear all local tasks, organizations, accounts, and storage to restart with a clean state.
          </p>
          <button
            onClick={handleReset}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Clear All Application Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
