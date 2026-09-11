import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { PERSONALITY_AVATARS } from '../../data/avatars';
import type { Organization } from '../../types';
import {
  loadGoogleGsiScript,
  parseGoogleJwt,
  DEFAULT_GOOGLE_CLIENT_ID,
  ALLOWED_GOOGLE_DOMAIN,
  isAllowedGoogleEmail,
  type GoogleUserProfile,
} from '../../utils/googleAuth';
import {
  X,
  Sparkles,
  Building2,
  User,
  ArrowRight,
  Check,
  Globe,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const GoogleAuthModal: React.FC = () => {
  const {
    isGoogleAuthModalOpen,
    setIsGoogleAuthModalOpen,
    pendingInviteCode,
    getOrgByInviteCode,
    signInWithGoogle,
    createOrganization,
    requestToJoinOrg,
    showToast,
  } = useTaskContext();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Google Auth, 2: Profile (Name & Avatar), 3: Org Setup / Join Request
  const [emailInput, setEmailInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(PERSONALITY_AVATARS[0].url);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);

  const [orgNameInput, setOrgNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  const [joinSubmitted, setJoinSubmitted] = useState(false);
  const [requestedOrgName, setRequestedOrgName] = useState('');
  const [googleGsiLoaded, setGoogleGsiLoaded] = useState(false);
  const [targetOrg, setTargetOrg] = useState<Organization | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Load Google Identity Services SDK on modal open
  useEffect(() => {
    if (isGoogleAuthModalOpen) {
      if (pendingInviteCode) {
        setInviteCodeInput(pendingInviteCode);
        void getOrgByInviteCode(pendingInviteCode).then((org) => setTargetOrg(org));
      }

      loadGoogleGsiScript().then((success) => {
        if (success) {
          setGoogleGsiLoaded(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch invite org when code/modal changes
  }, [isGoogleAuthModalOpen, pendingInviteCode]);

  // Initialize and Render Real Google OAuth Sign-In Button
  useEffect(() => {
    if (isGoogleAuthModalOpen && googleGsiLoaded && step === 1 && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: DEFAULT_GOOGLE_CLIENT_ID,
          hd: ALLOWED_GOOGLE_DOMAIN,
          callback: (response: any) => {
            if (response?.credential) {
              const googleProfile = parseGoogleJwt(response.credential);
              if (googleProfile) {
                handleRealGoogleSuccess(googleProfile, response.credential);
              }
            }
          },
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
          });
        }
      } catch (err) {
        console.warn('Google Identity Services initialization warning:', err);
      }
    }
  }, [isGoogleAuthModalOpen, googleGsiLoaded, step]);

  if (!isGoogleAuthModalOpen) return null;

  // Handle Real Google OAuth Login Success
  const handleRealGoogleSuccess = (profile: GoogleUserProfile, credential: string) => {
    if (!isAllowedGoogleEmail(profile.email)) {
      showToast(`Only @${ALLOWED_GOOGLE_DOMAIN} Google accounts can sign in`, 'warning');
      return;
    }
    setGoogleCredential(credential);
    setEmailInput(profile.email);
    setDisplayName(profile.name);
    // Select personality avatar based on hash or default
    const avatarIndex = Math.abs(profile.email.length) % PERSONALITY_AVATARS.length;
    setSelectedAvatarUrl(PERSONALITY_AVATARS[avatarIndex].url);
    showToast(`Authenticated via Google as ${profile.email}!`, 'success');
    setStep(2);
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (!isAllowedGoogleEmail(emailInput)) {
      showToast(`Only @${ALLOWED_GOOGLE_DOMAIN} Google accounts can sign in`, 'warning');
      return;
    }
    setGoogleCredential(null);
    const fallbackName = emailInput.split('@')[0];
    setDisplayName((prev) => prev || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
    setStep(2);
  };

  const handleProfileComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await signInWithGoogle(
        emailInput,
        displayName,
        selectedAvatarUrl,
        googleCredential || undefined
      );
      setStep(3);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sign-in failed', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgNameInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createOrganization(orgNameInput);
      setIsGoogleAuthModalOpen(false);
      setStep(1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create org', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinOrgSubmit = async (codeToUse: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await requestToJoinOrg(codeToUse);
      if (res.success && res.org) {
        setRequestedOrgName(res.org.name);
        setJoinSubmitted(true);
      } else {
        showToast(res.message, 'warning');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-sm animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              C
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base leading-tight">Commit</div>
              <div className="text-xs text-slate-500 font-medium">Multi-Tenant Work Tracker</div>
            </div>
          </div>

          <button
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* STEP 1: GOOGLE OAUTH SIGN IN */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-1">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {targetOrg ? `Join ${targetOrg.name} on Commit` : 'Sign in with Google Account'}
                </h2>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {targetOrg
                    ? `You've been invited to join ${targetOrg.name}. Enter your Google email to proceed.`
                    : 'Track obligations & commitments effortlessly across your organization.'}
                </p>
              </div>

              {/* Direct Google Email Input */}
              <form onSubmit={handleCustomEmailSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Medflix Google Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={`e.g. you@${ALLOWED_GOOGLE_DOMAIN}`}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium text-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer text-sm flex items-center justify-center space-x-2 shadow-2xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* OFFICIAL GOOGLE SIGN-IN BUTTON CONTAINER */}
              <div className="pt-3 border-t border-slate-100 flex flex-col items-center justify-center">
                <div className="text-[11px] text-slate-400 font-medium mb-1.5 text-center">
                  Google OAuth 2.0 Identity Button (VITE_GOOGLE_CLIENT_ID):
                </div>
                <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center" />
              </div>
            </div>
          )}

          {/* STEP 2: DISPLAY NAME & PERSONALITY AVATAR SELECTION */}
          {step === 2 && (
            <form onSubmit={handleProfileComplete} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Set Up Your Profile
                </h2>
                <p className="text-slate-500 text-xs">
                  Choose your display name and a personality avatar for your team.
                </p>
              </div>

              {/* Display Name Input (Single field) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Personality Avatar Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Choose Your Personality Avatar
                </label>
                <div className="grid grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {PERSONALITY_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatarUrl(av.url)}
                      className={`p-2 rounded-xl border flex flex-col items-center space-y-1 transition cursor-pointer relative ${
                        selectedAvatarUrl === av.url
                          ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/30'
                          : 'bg-white border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={av.url}
                          alt={av.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white"
                        />
                        <span className="absolute -bottom-1 -right-1 text-xs">{av.emoji}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center">
                        {av.name}
                      </span>

                      {selectedAvatarUrl === av.url && (
                        <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ORG CREATION OR JOIN REQUEST */}
          {step === 3 && (
            <div>
              {joinSubmitted ? (
                /* Confirmation Screen when join request submitted */
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center animate-bounce">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Join Request Sent to Admin!
                    </h3>
                    <p className="text-slate-600 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Your request to join <span className="font-bold text-slate-900">{requestedOrgName}</span> has been sent to the Organization Admin. You will be notified as soon as it is approved!
                    </p>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-left text-xs text-amber-900 flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Organization join requests require Admin approval to ensure secure workspace access.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGoogleAuthModalOpen(false)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              ) : targetOrg ? (
                /* Invited to specific Org Pathway */
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 mx-auto flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Request to Join {targetOrg.name}
                    </h3>
                    <p className="text-slate-500 text-xs">
                      You were invited via link (`{targetOrg.inviteCode}`). Submit your request below for Admin approval.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-3">
                    <img
                      src={selectedAvatarUrl}
                      alt={displayName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 bg-white"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{displayName}</div>
                      <div className="text-slate-500 text-xs">{emailInput}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJoinOrgSubmit(targetOrg.inviteCode)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Request to Join {targetOrg.name}</span>
                  </button>
                </div>
              ) : (
                /* Organic Signup: Create Org OR Enter Invite Code */
                <div className="space-y-6">
                  {/* Create New Org Form */}
                  <form onSubmit={handleCreateOrgSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Create New Organization
                      </label>
                      <p className="text-slate-500 text-xs mb-2">
                        Set up a workspace for your company or team.
                      </p>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Acme Corp"
                          value={orgNameInput}
                          onChange={(e) => setOrgNameInput(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Create Organization & Launch</span>
                    </button>
                  </form>

                  <div className="relative text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">
                      OR Join via Invite Link / Code
                    </span>
                  </div>

                  {/* Join Existing Org by Invite Code Form */}
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter invite code (e.g. acme-1234)"
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium text-slate-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJoinOrgSubmit(inviteCodeInput)}
                      disabled={!inviteCodeInput.trim()}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <span>Request to Join Organization</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
