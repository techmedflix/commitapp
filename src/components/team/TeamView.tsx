import React, { useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import type { UserRole } from '../../types';
import { TaskRow } from '../tasks/TaskRow';
import { formatDateLabel } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  X,
  Copy,
  Building2,
  ShieldAlert,
  Link,
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const {
    activeOrg,
    orgUsers,
    orgTasks,
    activeUser,
    selectedTeamMemberId,
    setSelectedTeamMemberId,
    inviteTeamMember,
    pendingRequestsCount,
    setIsPendingRequestsModalOpen,
    showToast,
  } = useTaskContext();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Member');

  const selectedMember = orgUsers.find((u) => u.id === selectedTeamMemberId);
  const isAdmin = Boolean(activeUser && (activeUser.role === 'Workspace Admin' || (activeOrg && activeOrg.adminId === activeUser.id)));

  const getMemberStats = (memberId: string) => {
    const memberTasks = orgTasks.filter(
      (t) => t.assigneeId === memberId && t.status !== 'completed'
    );
    const overdueCount = memberTasks.filter((t) => {
      if (!t.requestedDeadline) return false;
      return formatDateLabel(t.requestedDeadline).isOverdue;
    }).length;
    const blockedCount = memberTasks.filter((t) => t.status === 'blocked').length;

    return {
      open: memberTasks.length,
      overdue: overdueCount,
      blocked: blockedCount,
    };
  };

  const handleCopyInviteLink = () => {
    if (!activeOrg) return;
    const inviteUrl = `${window.location.origin}/?invite=${activeOrg.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast(`Copied ${activeOrg.name} invite link to clipboard!`, 'info');
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    inviteTeamMember(inviteName, inviteEmail, inviteRole);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('Member');
  };

  const memberAssignedTasks = selectedTeamMemberId
    ? orgTasks.filter((t) => t.assigneeId === selectedTeamMemberId && t.status !== 'completed')
    : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {(activeOrg?.name || 'ORGANIZATION').toUpperCase()} TEAM DIRECTORY
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full border border-indigo-200 font-semibold">
              {orgUsers.length} members
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Active members and workload in {activeOrg?.name || 'your workspace'}.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {activeOrg && (
            <button
              onClick={handleCopyInviteLink}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition border border-slate-200 cursor-pointer"
            >
              <Link className="w-4 h-4 text-indigo-600" />
              <span>Copy Team Invite Link</span>
            </button>
          )}

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Pending Requests Banner for Admins */}
        {isAdmin && pendingRequestsCount > 0 && activeOrg && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-amber-900 text-sm">
                  {pendingRequestsCount} Pending Organization Join {pendingRequestsCount === 1 ? 'Request' : 'Requests'}
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  New users clicked the team invite link for {activeOrg.name} and are waiting for your approval.
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsPendingRequestsModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
            >
              Review Requests
            </button>
          </div>
        )}

        {/* Invite Link Info Box */}
        {activeOrg && (
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  Shareable Team Invite Code: <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">{activeOrg.inviteCode}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Anyone with this link can request to join {activeOrg.name}. Admins must approve each request.
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyInviteLink}
              className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-2xs shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Link</span>
            </button>
          </div>
        )}

        {/* Team Members Grid */}
        {orgUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 text-indigo-400 mx-auto opacity-40" />
            <h3 className="font-bold text-slate-900 text-base">No team members yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeOrg ? `Invite colleagues to ${activeOrg.name} using the invite button or link above.` : 'Create or join an organization to start collaborating.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {orgUsers.map((member) => {
            const stats = getMemberStats(member.id);
            const isSelected = selectedTeamMemberId === member.id;

            return (
              <div
                key={member.id}
                onClick={() => setSelectedTeamMemberId(isSelected ? null : member.id)}
                className={`bg-white border rounded-2xl p-5 transition cursor-pointer hover:border-slate-300 select-none shadow-2xs ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate text-base flex items-center justify-between">
                      <span>{member.name}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{member.email}</div>
                  </div>
                </div>

                {/* Metric Summary Counters */}
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200 font-semibold">
                  <div>
                    <div className="text-slate-900 font-bold text-sm">{stats.open}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Open</div>
                  </div>
                  <div>
                    <div className={`${stats.overdue > 0 ? 'text-rose-600 font-bold text-sm' : 'text-slate-700'}`}>
                      {stats.overdue}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Overdue</div>
                  </div>
                  <div>
                    <div className={`${stats.blocked > 0 ? 'text-rose-600 font-bold text-sm' : 'text-slate-700'}`}>
                      {stats.blocked}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Blocked</div>
                  </div>
                </div>

                <div className="mt-3.5 text-center">
                  <span className="text-xs text-indigo-600 hover:underline font-semibold">
                    {isSelected ? 'Hide assigned tasks ↑' : 'View assigned tasks →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Selected Member Task Breakdown Section */}
        {selectedMember && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedMember.avatar}
                  alt={selectedMember.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Open Commitments Assigned to Doer: {selectedMember.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {memberAssignedTasks.length} open tasks in {activeOrg?.name || 'Workspace'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamMemberId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {memberAssignedTasks.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  No open tasks currently assigned to {selectedMember.name} in {activeOrg?.name || 'Workspace'}.
                </div>
              ) : (
                memberAssignedTasks.map((t) => <TaskRow key={t.id} task={t} mode="waiting_for" />)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Invite Team Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="sarah@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Member" className="bg-white">Member</option>
                  <option value="Workspace Admin" className="bg-white">Workspace Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
