import React, { useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { CheckSquare, ArrowRight, Sparkles, X } from 'lucide-react';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({ isOpen, onClose }) => {
  const { users, setActiveUser } = useTaskContext();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-base">Welcome to Commit</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 mx-auto flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Everything you owe. Everything owed to you.
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                Commit is a single reliable system of record for commitments within your team.
                Simple, lightweight commitment tracking between Creators and Doers.
              </p>

              <div className="grid grid-cols-2 gap-3 text-left pt-2">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="font-bold text-indigo-700 text-xs mb-1">MY WORK</div>
                  <div className="text-slate-600 text-xs">What I need to do (Doer view).</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="font-bold text-amber-700 text-xs mb-1">WAITING FOR</div>
                  <div className="text-slate-600 text-xs">What I am waiting for others to do (Creator view).</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">5-Step Commitment Workflow</h3>
              <div className="space-y-2.5 text-slate-700 text-xs">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-indigo-600">1</span>
                  <div>
                    <div className="font-bold text-slate-900">Create</div>
                    <div className="text-slate-500">Creator assigns task to Doer.</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-indigo-600">2</span>
                  <div>
                    <div className="font-bold text-slate-900">Acknowledge & Accept</div>
                    <div className="text-slate-500">Doer accepts and sets their own Doer ETA.</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-indigo-600">3</span>
                  <div>
                    <div className="font-bold text-slate-900">Start Working</div>
                    <div className="text-slate-500">Task moves to In Progress.</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-indigo-600">4</span>
                  <div>
                    <div className="font-bold text-slate-900">Blocked / Nudge</div>
                    <div className="text-slate-500">If blocked, Doer enters reason. Creator can Nudge.</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-indigo-600">5</span>
                  <div>
                    <div className="font-bold text-slate-900">Complete</div>
                    <div className="text-slate-500">Doer completes with optional note. Creator notified.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Select Active Team Member to Start</h3>
              <p className="text-slate-600 text-xs">
                You can switch between any team member in the top navigation bar at any time to experience both Creator and Doer workflows!
              </p>

              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-xs text-slate-500 font-medium">No team members registered yet.</p>
                    <button
                      onClick={onClose}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Sign In & Create Organization
                    </button>
                  </div>
                ) : (
                  users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveUser(u);
                        onClose();
                      }}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center justify-between transition cursor-pointer text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-slate-500 text-xs">{u.email}</div>
                        </div>
                      </div>
                      <span className="text-indigo-600 hover:underline font-semibold flex items-center space-x-1 text-xs">
                        <span>Log in as {u.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
