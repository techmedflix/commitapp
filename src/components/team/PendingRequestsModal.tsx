import React from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { X, UserCheck, UserX, Clock, ShieldCheck, Check } from 'lucide-react';

export const PendingRequestsModal: React.FC = () => {
  const {
    isPendingRequestsModalOpen,
    setIsPendingRequestsModalOpen,
    activeOrg,
    pendingRequestsForActiveOrg,
    approveJoinRequest,
    rejectJoinRequest,
  } = useTaskContext();

  if (!isPendingRequestsModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-sm animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base leading-tight">
                Pending Join Requests
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {activeOrg?.name || 'Organization'} ({pendingRequestsForActiveOrg.length} waiting)
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsPendingRequestsModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              As Admin of <strong>{activeOrg?.name || 'Organization'}</strong>, approve applicants to grant them access to team commitments.
            </span>
          </div>

          {pendingRequestsForActiveOrg.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Check className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <div className="font-bold text-slate-800 text-sm">No Pending Requests</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                All team join requests for {activeOrg?.name || 'Organization'} have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequestsForActiveOrg.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between transition hover:border-slate-300"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                    <img
                      src={req.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={req.userName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate text-sm">
                        {req.userName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{req.userEmail}</div>
                      <div className="text-[11px] text-amber-700 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Requested via Invite Link</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => rejectJoinRequest(req.id)}
                      className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => approveJoinRequest(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={() => setIsPendingRequestsModalOpen(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
