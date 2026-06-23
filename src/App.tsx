import { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Calendar, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Send, 
  User, 
  LogOut, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  BookOpen, 
  ArrowRight,
  ClipboardList,
  Flame,
  ThumbsUp,
  FileText,
  Loader2,
  RefreshCw,
  Plus
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from "./firebase";
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  fetchGmailMessages, 
  sendGmailMessage 
} from "./googleApi";
import { 
  CalendarEvent, 
  EmailMessage, 
  CoachingResponse, 
  FocusRecommendation, 
  DeadlineEmail, 
  PreworkDraft 
} from "./types";

function HourglassLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Left "1" - Electric Blue / Cyan */}
      <path 
        d="M 25 15 L 43 15 L 43 25 L 36 28 L 45 50 L 36 72 L 43 75 L 43 85 L 20 85 L 20 75 L 28 75 L 28 25 L 20 25 L 20 15 Z" 
        fill="currentColor"
      />
      {/* Right "1" - Mirrored - Electric Blue / Cyan */}
      <path 
        d="M 75 15 L 57 15 L 57 25 L 64 28 L 55 50 L 64 72 L 57 75 L 57 85 L 80 85 L 80 75 L 72 75 L 72 25 L 80 25 L 80 15 Z" 
        fill="currentColor"
      />
      {/* Cap bars to enclose the hourglass shape beautifully */}
      <rect x="41.5" y="15" width="17" height="1.5" fill="currentColor" opacity="0.6" />
      <rect x="41.5" y="83.5" width="17" height="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export default function App() {
  // Authentication & Session
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Synchronized Google Data
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [gmailMessages, setGmailMessages] = useState<EmailMessage[]>([]);

  // AI-Powered State
  const [ventText, setVentText] = useState<string>("");
  const [isCoaching, setIsCoaching] = useState<boolean>(false);
  const [coachingData, setCoachingData] = useState<CoachingResponse | null>(null);

  // Scheduler Recommender
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDeadline, setTaskDeadline] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [schedulerRecommendations, setSchedulerRecommendations] = useState<FocusRecommendation[]>([]);

  // Email Deadline Detectors
  const [detectedDeadlines, setDetectedDeadlines] = useState<DeadlineEmail[]>([]);
  const [isDetectingEmails, setIsDetectingEmails] = useState<boolean>(false);

  // Drafting Studio
  const [draftContext, setDraftContext] = useState<string>("");
  const [draftType, setDraftType] = useState<'prep_doc' | 'introduction' | 'extension_request'>("prep_doc");
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<PreworkDraft | null>(null);
  
  // Custom Email Sender Modal & State
  const [emailRecipient, setEmailRecipient] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [showSendSuccess, setShowSendSuccess] = useState<boolean>(false);

  // Confirmation Modals
  const [modalTarget, setModalTarget] = useState<'calendar' | 'email' | null>(null);
  const [calendarPayload, setCalendarPayload] = useState<FocusRecommendation | null>(null);

  // Pre-configured Stress Coping Presets
  const panicPresets = [
    { text: "My project is due in 3 hours and I haven't started. I am totally paralyzingly stuck.", label: "Unstarted Due Soon" },
    { text: "I have 4 back-to-back client meetings tomorrow, no review slides, and no presentation agenda. Help!", label: "Meeting Pileup" },
    { text: "My professor rejected my proposal and I have to submit a new one by tonight, but my mind is a complete blank.", label: "Blank Mind Crisis" },
  ];

  // Active section tracking (tabs)
  const [activeTab, setActiveTab] = useState<'scheduler' | 'inbox' | 'drafts'>("scheduler");

  // Floating Toast Notifications to replace iframe-restricted window.alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Initialize Auth State on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (loggedInUser, fetchedToken) => {
        setUser(loggedInUser);
        setToken(fetchedToken);
        setNeedsAuth(false);
        // Automatically fetch initial workspace sync
        syncGoogleWorkspace(fetchedToken);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Calendar and Gmail directly
  const syncGoogleWorkspace = async (accessToken: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // 1. Fetch Calendar
      const events = await fetchCalendarEvents(accessToken);
      setCalendarEvents(events);

      // 2. Fetch Gmail Messages
      const emails = await fetchGmailMessages(accessToken);
      setGmailMessages(emails);

      // 3. Automatically perform background deadline audit with the fetched emails
      if (emails.length > 0) {
        triggerEmailDeadlineAudit(emails);
      }
    } catch (err: any) {
      console.error("Workspace sync error:", err);
      setSyncError("Failed to sync metrics from Google account. Your session might be stale.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setUser(authResult.user);
        setToken(authResult.accessToken);
        setNeedsAuth(false);
        await syncGoogleWorkspace(authResult.accessToken);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    // Clear state
    setCalendarEvents([]);
    setGmailMessages([]);
    setCoachingData(null);
    setSchedulerRecommendations([]);
    setDetectedDeadlines([]);
    setCurrentDraft(null);
  };

  // 1. Fire up "The Last-Minute Life Saver" Vent Response
  const submitVentToCoach = async (textToSubmit?: string) => {
    const resolvedText = textToSubmit || ventText;
    if (!resolvedText.trim()) return;

    setIsCoaching(true);
    try {
      const response = await fetch("/api/coach-overwhelm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventText: resolvedText,
          localTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Coach failed to respond. The system may be overloaded.");
      }

      const data = await response.json();
      setCoachingData(data);
      
      // Auto populate scheduler with detected crisis focus
      if (data.criticalAction) {
        setTaskTitle(data.criticalAction);
        setTaskDeadline("Tonight/Tomorrow");
      }
    } catch (err: any) {
      showToast(err.message || "Coaching analysis failed.", "error");
    } finally {
      setIsCoaching(false);
    }
  };

  // 2. Schedule Recommendation
  const generateScheduleSuggestions = async () => {
    if (!taskTitle.trim() || !token) return;
    setIsScheduling(true);
    try {
      const response = await fetch("/api/suggest-focus-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle,
          deadline: taskDeadline,
          calendarEvents,
          localTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to formulate calendar suggestion.");
      }

      const data = await response.json();
      setSchedulerRecommendations(data.proposedSlots || []);
    } catch (err: any) {
      showToast(err.message || "Time blocking calculation failed.", "error");
    } finally {
      setIsScheduling(false);
    }
  };

  // 3. Email Deadline Detector Audit
  const triggerEmailDeadlineAudit = async (emailsToAnalyze: EmailMessage[]) => {
    setIsDetectingEmails(true);
    try {
      const response = await fetch("/api/analyze-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailsToAnalyze })
      });
      if (!response.ok) throw new Error("Email audit failed.");
      const data = await response.json();
      setDetectedDeadlines(data.deadlines || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDetectingEmails(false);
    }
  };

  // 4. Prework Material Drafting
  const selectDraftMaterial = async (contextInput: string, typeVal: 'prep_doc' | 'introduction' | 'extension_request') => {
    setDraftContext(contextInput);
    setDraftType(typeVal);
    setIsDrafting(true);
    try {
      const response = await fetch("/api/draft-prework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextInput,
          type: typeVal
        })
      });

      if (!response.ok) throw new Error("Drafting failed.");
      const data = await response.json();
      setCurrentDraft({
        title: data.title,
        content: data.content,
        type: typeVal
      });

      // Highlight drafts pane automatically
      setActiveTab("drafts");

      // Auto load into sender states if email type
      if (typeVal !== 'prep_doc') {
        setEmailSubject(data.title);
        setEmailBody(data.content);
        setEmailRecipient("");
      }
    } catch (err: any) {
      showToast(err.message || "Drafting engine failed.", "error");
    } finally {
      setIsDrafting(false);
    }
  };

  // Calendar Event confirmation modal clicker
  const requestBookCalendar = (slot: FocusRecommendation) => {
    setCalendarPayload(slot);
    setModalTarget('calendar');
  };

  const confirmBookCalendar = async () => {
    if (!calendarPayload || !token) return;
    try {
      await createCalendarEvent(token, {
        summary: calendarPayload.title,
        description: `${calendarPayload.rationale}\n\n[Created via Last-Minute Life Saver]`,
        startTime: calendarPayload.startTime,
        endTime: calendarPayload.endTime
      });
      showToast(`Success! "${calendarPayload.title}" has been added to your Google Calendar.`, "success");
      // Re-fetch calendar to show update
      syncGoogleWorkspace(token);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to insert event into Google Calendar: " + err.message, "error");
    } finally {
      setModalTarget(null);
      setCalendarPayload(null);
    }
  };

  // Gmail Send action trigger
  const requestSendEmail = () => {
    setModalTarget('email');
  };

  const confirmSendEmail = async () => {
    if (!emailRecipient || !emailSubject || !emailBody || !token) {
      showToast("Please ensure Recipient, Subject, and Body are completed first.", "info");
      return;
    }
    setIsSendingEmail(true);
    try {
      await sendGmailMessage(token, {
        to: emailRecipient,
        subject: emailSubject,
        body: emailBody
      });
      setShowSendSuccess(true);
      setTimeout(() => {
        setShowSendSuccess(false);
      }, 5000);
    } catch (err: any) {
      showToast("Error sending email: " + err.message, "error");
    } finally {
      setIsSendingEmail(false);
      setModalTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden">
      
      {/* Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -28, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
            className="fixed top-6 left-1/2 z-50 px-5 py-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-3 backdrop-blur-xl"
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
            <span className="text-xs font-semibold text-white tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/15 blur-[120px] glow-bg"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px] glow-bg"></div>
        <div className="absolute top-[20%] right-[10%] w-[10%] z-0 h-[30%] rounded-full bg-purple-600/10 blur-[100px] glow-bg"></div>
      </div>

      {/* Header Bar */}
      <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center relative z-10" id="applet-header-layout">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <HourglassLogo className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                11th Hour
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3 animate-pulse" /> PROACTIVE CRITICAL AGENT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {user.displayName || user.email}
                </span>
              </div>
            )}
            
            {user ? (
              <button 
                id="btn-logout"
                onClick={handleLogout}
                className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 text-xs font-bold uppercase transition hover:bg-cyan-500/20"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Login Screen Segment */}
      <AnimatePresence mode="wait">
        {needsAuth ? (
          <motion.main 
            key="login-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            id="login-panel"
          >
            {/* Spotlight Glow behind */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none"></div>

            <div className="p-5 bg-cyan-500 rounded-3xl shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-6 relative z-10 flex items-center justify-center border border-white/20">
              <HourglassLogo className="w-14 h-14 text-black" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-300 rounded-full animate-ping"></div>
            </div>

            <h2 className="text-3xl font-bold font-display text-white tracking-tight leading-none mb-3 relative z-10">
              Your Deadlines Are Approaching Fast.
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mb-8 leading-relaxed relative z-10">
              Unlock a hyper-aggressive productivity companion. Direct integration with Google Calendar and Gmail to salvage tight constraints, automate prework slide agendas, schedule deep blocks immediately, and survive under fire.
            </p>

            <button
              id="gsi-google-login"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full relative group outline-none overflow-hidden hover:scale-[1.02] cursor-pointer z-10"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center justify-center p-3 bg-white text-slate-900 font-medium rounded-xl border border-white/20 transition-all shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20">
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mr-2" />
                ) : (
                  <div className="gsi-material-button-icon w-5 h-5 mr-3">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                )}
                <span className="text-base font-semibold tracking-tight">Sign in with Google</span>
              </div>
            </button>

            <p className="text-[10px] font-mono text-slate-500 mt-6 tracking-wide uppercase">
              Authentication and Scopes Secured via Google OAuth
            </p>
          </motion.main>
        ) : (
          <motion.main 
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6"
            id="dashboard-container"
          >
            {/* Syncing State Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 relative z-10" id="sync-status-card">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-cyan-500 animate-spin' : 'bg-green-400 animate-pulse'}`} />
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block font-mono">
                    Workspace Synchronization
                  </span>
                  <p className="text-sm font-medium text-white">
                    {isSyncing 
                      ? 'Re-indexing inbox & calendar files...' 
                      : `Synchronized: ${calendarEvents.length} calendar events, ${gmailMessages.length} fresh emails detected`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {syncError && <span className="text-xs text-cyan-400 font-mono mr-2">{syncError}</span>}
                <button
                  id="btn-trigger-sync"
                  onClick={() => token && syncGoogleWorkspace(token)}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold backdrop-blur-md text-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} /> Sync Workspace
                </button>
              </div>
            </div>

            {/* Immersive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Overwhelm Solver & Proactive Coaching Responses */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Panic & Overwhelm Venting Box */}
                <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl relative z-10" id="vent-panel">
                  <div className="flex items-center gap-2.5 mb-4">
                    <HourglassLogo className="w-5.5 h-5.5 text-cyan-400 animate-pulse" />
                    <div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-white leading-none">
                        Venting Crisis Center
                      </h3>
                      <p className="text-xs text-slate-400">Vent your stress, deadlines, or workload blockages below.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      id="input-vent-textbox"
                      className="w-full h-32 px-4 py-3 bg-black/40 text-slate-200 text-sm rounded-xl border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none transition"
                      placeholder="e.g., I'm totally drowning. I have a presentation tomorrow for 10 high-value stakeholders, and I don't have my bullet slides, let alone prep materials. I need a chronological master timeline right now..."
                      value={ventText}
                      onChange={(e) => setVentText(e.target.value)}
                    />

                    {/* Presets Grid */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
                        Preset Overwhelms (Quick Simulation)
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {panicPresets.map((preset, idx) => (
                           <button
                            key={idx}
                            id={`btn-preset-${idx}`}
                            onClick={() => {
                              setVentText(preset.text);
                              submitVentToCoach(preset.text);
                            }}
                            className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-300 transition line-clamp-1 truncate block cursor-pointer"
                          >
                            ⚡ {preset.label}: "{preset.text}"
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      id="btn-submit-crisis-vent"
                      disabled={isCoaching || !ventText.trim()}
                      onClick={() => submitVentToCoach()}
                      className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-cyan-500/40 disabled:opacity-50 transition cursor-pointer select-none"
                    >
                      {isCoaching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>CALCULATING COPETYPE STATUS...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-white stroke-[2.5]" />
                          <span>TALK ME DOWN & CREATE TARGETS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Aggressive Coach Result Response Panel */}
                <AnimatePresence>
                  {coachingData && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl relative z-10 space-y-4"
                      id="coach-response-box"
                    >
                      {/* Coach Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-cyan-400" />
                          <span className="text-xs font-mono font-black uppercase tracking-[0.2em] text-cyan-400">
                            CRISIS LEVEL: {coachingData.panicLevel}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          PROACTIVE FEEDBACK
                        </span>
                      </div>

                      {/* Coach Motivation Quote */}
                      <div className="p-4 bg-black/40 rounded-xl border border-white/10 font-display italic text-cyan-400 text-sm leading-relaxed relative">
                        <HourglassLogo className="w-8 h-8 absolute -bottom-2 -right-1 text-cyan-500/20 stroke-[1.5]" />
                        "{coachingData.motivationalQuote}"
                      </div>

                      {/* Coach Diagnosis Paragraph */}
                      <div>
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Coach Assessment
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {coachingData.analysis}
                        </p>
                      </div>

                      {/* Visual Call To Action Block */}
                      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                            One Critical Immediate Action Task
                          </span>
                          <p className="text-sm font-semibold text-slate-100">
                            {coachingData.criticalAction}
                          </p>
                        </div>
                      </div>

                      {/* Chronological Step List */}
                      <div className="space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                          Your Tactical Micro-Step Path
                        </span>
                        
                        <div className="space-y-2">
                          {coachingData.microSteps.map((step, idx) => (
                            <div 
                              key={idx}
                              id={`micro-step-${idx}`}
                              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-start justify-between gap-3 text-xs text-slate-300 transition"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-white/10">
                                    STEP {idx + 1}
                                  </span>
                                  <span className="font-medium text-white text-xs">{step.step}</span>
                                </div>
                                <p className="text-slate-400 leading-relaxed text-[11px]">{step.description}</p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] bg-cyan-500/10 px-2 py-1 border border-cyan-500/30 rounded-lg text-cyan-400">
                                <Clock className="w-3 h-3" />
                                <span>{step.durationMinutes}m</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prework Quick Action Injector */}
                      <div className="pt-2 border-t border-white/10 flex justify-between gap-2.5">
                        <button
                          id="btn-quick-outline"
                          onClick={() => {
                            setTaskTitle(coachingData.criticalAction);
                            selectDraftMaterial(coachingData.criticalAction, 'prep_doc');
                          }}
                          className="flex-1 py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold backdrop-blur-md text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Prework Study Sheet
                        </button>
                        <button
                          id="btn-quick-extension"
                          onClick={() => {
                            setTaskTitle(coachingData.criticalAction);
                            selectDraftMaterial(coachingData.criticalAction, 'extension_request');
                          }}
                          className="flex-1 py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold backdrop-blur-md text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-450 text-cyan-400" /> Extension Email Draft
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* RIGHT COLUMN: The "Panic Matrix" Workspace Workspace Tabs */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Focus Dashboard Critical Action Spotlight */}
                <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl relative z-10" id="critical-focus-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase font-black flex items-center gap-1">
                        <HourglassLogo className="w-3.5 h-3.5 text-cyan-400" /> Tactical Focus Target
                      </span>
                      <h4 className="text-lg font-bold text-white tracking-tight leading-tight">
                        Calculate Immediate Focused Work Blocks
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                        Check current calendar event constraints, then schedule a dedicated 2-hour deep focus slot right now, without causing any scheduling overlaps.
                      </p>
                    </div>

                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl shrink-0">
                      <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Input form for task scheduled suggestions */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">Task Subject</label>
                      <input
                        type="text"
                        id="input-task-title"
                        className="w-full px-3 py-2 bg-black/40 text-xs rounded-xl border border-white/10 text-slate-200 outline-none focus:border-cyan-500/50"
                        placeholder="e.g. Stakeholder presentation slide deck"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">Target Deadline</label>
                      <input
                        type="text"
                        id="input-task-deadline"
                        className="w-full px-3 py-2 bg-black/40 text-xs rounded-xl border border-white/10 text-slate-200 outline-none focus:border-cyan-500/50"
                        placeholder="e.g. Tomorrow at 5 PM"
                        value={taskDeadline}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      id="btn-calculate-focus-slots"
                      disabled={isScheduling || !taskTitle.trim()}
                      onClick={generateScheduleSuggestions}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isScheduling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Recommending...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-black" /> Formulate Time-Blocks
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* THE TAB MATRIX SYSTEM */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl overflow-hidden relative z-10" id="workspace-tabs-card">
                  
                  {/* Tab Navigation links */}
                  <div className="flex border-b border-white/10 bg-black/40">
                    <button
                      id="tab-scheduler"
                      onClick={() => setActiveTab("scheduler")}
                      className={`flex-1 py-4 text-xs font-bold tracking-tight uppercase flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
                        activeTab === "scheduler" 
                          ? "border-cyan-500 text-white bg-white/5" 
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-cyan-400" /> Calendar Focus
                    </button>
                    <button
                      id="tab-inbox"
                      onClick={() => setActiveTab("inbox")}
                      className={`flex-1 py-4 text-xs font-bold tracking-tight uppercase flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
                        activeTab === "inbox" 
                          ? "border-cyan-500 text-white bg-white/5" 
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Mail className="w-4 h-4 text-cyan-400" /> Gmail Audit
                    </button>
                    <button
                      id="tab-drafts"
                      onClick={() => setActiveTab("drafts")}
                      className={`flex-1 py-4 text-xs font-bold tracking-tight uppercase flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
                        activeTab === "drafts" 
                          ? "border-cyan-500 text-white bg-white/5" 
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" /> Drafting Studio
                    </button>
                  </div>

                  <div className="p-6 min-h-[400px]">
                    
                    {/* PANIC SUB-VIEW: CALENDAR FOCUS SCHEDULER */}
                    {activeTab === "scheduler" && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="space-y-6"
                      >
                        {/* Display Scheduler recommendations */}
                        {schedulerRecommendations.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 block font-bold">
                              AI PROPOSED FOCUS INTERSECTIONS
                            </span>
                            <div className="grid grid-cols-1 gap-3">
                              {schedulerRecommendations.map((rec, i) => (
                                <div 
                                  key={i}
                                  className="p-4 bg-black/40 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center hover:border-white/20 transition"
                                >
                                  <div className="space-y-1.5 flex-1">
                                    <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                                      <HourglassLogo className="w-3.5 h-3.5 text-cyan-400" /> {rec.title}
                                    </h5>
                                    
                                    <div className="flex gap-4 text-xs text-slate-400 font-mono">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                        {new Date(rec.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                        {new Date(rec.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(rec.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>

                                    <p className="text-xs text-slate-400 leading-relaxed italic">{rec.rationale}</p>
                                  </div>

                                  <button
                                    onClick={() => requestBookCalendar(rec)}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black rounded-xl shrink-0 flex items-center gap-1 transition cursor-pointer select-none"
                                  >
                                    <Plus className="w-4 h-4 text-black" /> Schedule Focus Block
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-black/20 border border-white/10 text-center text-xs text-slate-400 py-8">
                            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            Use the input fields above to formulate targeted focus recommendations.
                          </div>
                        )}

                        {/* Upcoming real calendar view */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 block">
                            Sync'd Upcoming Meetings (Conflicts Tracker)
                          </span>
                          
                          {calendarEvents.length > 0 ? (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {calendarEvents.map((event) => {
                                const startTimeStr = event.start.dateTime 
                                  ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                  : event.start.date || "All Day";
                                const startDayStr = event.start.dateTime 
                                  ? new Date(event.start.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) 
                                  : "Today";

                                return (
                                  <div 
                                    key={event.id}
                                    className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300">
                                        <Calendar className="w-4 h-4 text-cyan-400" />
                                      </div>
                                      <div>
                                        <h5 className="font-semibold text-slate-200">{event.summary}</h5>
                                        <p className="text-[10px] font-mono text-slate-500">{startDayStr} @ {startTimeStr}</p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setTaskTitle(event.summary);
                                        selectDraftMaterial(event.summary, 'prep_doc');
                                      }}
                                      className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded-lg border border-white/10 transition cursor-pointer"
                                    >
                                      Pre-work Prep
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-black/25 border border-white/10 text-center text-xs text-slate-500">
                              No upcoming calendar conflicts located.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}                    {/* PANIC SUB-VIEW: GMAIL AUDIT */}
                    {activeTab === "inbox" && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="space-y-6"
                      >
                        {/* Detected Deadlines Banner */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 block font-bold">
                            AI DEADLINE EMAIL INTEGRATION
                          </span>

                          {isDetectingEmails ? (
                            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                              <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
                              <p className="font-mono">GEMINI BOT AUDITING INBOX THREADS...</p>
                            </div>
                          ) : detectedDeadlines.length > 0 ? (
                            <div className="space-y-3">
                              {detectedDeadlines.map((item) => (
                                <div 
                                  key={item.id}
                                  className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 transition hover:border-white/20"
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                                          item.urgency === 'high' 
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                            : item.urgency === 'medium'
                                            ? 'bg-cyan-500/20 text-cyan-455 text-cyan-400 border border-cyan-500/30'
                                            : 'bg-white/5 text-slate-400 border border-white/10'
                                        }`}>
                                          {item.urgency} priority
                                        </span>
                                        <span className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-none">
                                          from: {item.sender}
                                        </span>
                                      </div>
                                      <h5 className="text-sm font-semibold text-white">{item.subject}</h5>
                                    </div>

                                    <div className="text-right font-mono text-[10px] text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded bg-cyan-500/5">
                                      Deadline: {item.detectedDeadline}
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-300 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="font-bold text-white mr-1">Summary:</span>
                                    {item.summary}
                                  </p>

                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 text-xs">
                                    <span className="text-slate-400 text-[11px]">
                                      <strong className="text-slate-200">Recommendation:</strong> {item.recommendedAction}
                                    </span>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                      <button
                                        id={`btn-audit-outline-${item.id}`}
                                        onClick={() => {
                                          setTaskTitle(item.subject);
                                          selectDraftMaterial(item.subject, 'prep_doc');
                                        }}
                                        className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[10px] font-semibold rounded-lg text-slate-300 flex items-center justify-center gap-1 border border-white/10 cursor-pointer"
                                      >
                                        <BookOpen className="w-3 h-3 text-cyan-400" /> Study Sheet
                                      </button>
                                      <button
                                        id={`btn-audit-extension-${item.id}`}
                                        onClick={() => {
                                          setTaskTitle(item.subject);
                                          selectDraftMaterial(item.subject, 'extension_request');
                                        }}
                                        className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[10px] font-semibold rounded-lg text-slate-300 flex items-center justify-center gap-1 border border-white/10 cursor-pointer"
                                      >
                                        <Mail className="w-3 h-3 text-cyan-400" /> Extension Email
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-black/25 border border-white/10 text-center text-xs text-slate-400">
                              Workspace inbox parsed. No immediate hidden deadlines located.
                            </div>
                          )}
                        </div>

                        {/* Recent Email Headers list */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 block">
                            Direct Gmail Inbox List
                          </span>

                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {gmailMessages.map((msg) => (
                              <div 
                                key={msg.id}
                                className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1.5 text-xs hover:border-white/20 transition"
                              >
                                <div className="flex justify-between items-center gap-4">
                                  <span className="font-semibold text-slate-300 truncate max-w-[150px]">{msg.from}</span>
                                  <span className="font-mono text-[9px] text-slate-500 truncate max-w-[110px]">{msg.date}</span>
                                </div>

                                <h6 className="font-bold text-white leading-tight">{msg.subject}</h6>
                                <p className="text-slate-400 text-[11px] line-clamp-1 truncate">{msg.snippet}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* PANIC SUB-VIEW: DRAFTING STUDIO */}
                    {activeTab === "drafts" && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="space-y-6"
                      >
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 block font-bold">
                            AI-POWERED AUTOPILOT DRAFTING STUDIO
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            
                            {/* Draft Form Context */}
                            <div className="md:col-span-4 space-y-4">
                              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                                <div>
                                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                                    Subject Context
                                  </label>
                                  <textarea
                                    id="draft-subject-input"
                                    className="w-full text-xs bg-black/50 border border-white/10 text-slate-200 rounded-xl p-3 focus:border-cyan-500 outline-none h-20 resize-none transition"
                                    placeholder="e.g., Requesting extension for biology thesis from Dr. Smith"
                                    value={draftContext}
                                    onChange={(e) => setDraftContext(e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                                    Artifact Type
                                  </label>
                                  
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      onClick={() => setDraftType('prep_doc')}
                                      className={`text-left px-3 py-2 rounded-xl text-xs transition border font-medium ${
                                        draftType === 'prep_doc' 
                                          ? 'bg-cyan-500 border-cyan-500 text-black font-black' 
                                          : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'
                                      }`}
                                    >
                                      📄 Study Prep Document
                                    </button>
                                    <button
                                      onClick={() => setDraftType('extension_request')}
                                      className={`text-left px-3 py-2 rounded-xl text-xs transition border font-medium ${
                                        draftType === 'extension_request' 
                                          ? 'bg-cyan-500 border-cyan-500 text-black font-black' 
                                          : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'
                                      }`}
                                    >
                                      ✉️ Extension Email Request
                                    </button>
                                    <button
                                      onClick={() => setDraftType('introduction')}
                                      className={`text-left px-3 py-2 rounded-xl text-xs transition border font-medium ${
                                        draftType === 'introduction' 
                                          ? 'bg-cyan-500 border-cyan-500 text-black font-black' 
                                          : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'
                                      }`}
                                    >
                                      👋 Introductory Setup Email
                                    </button>
                                  </div>
                                </div>

                                <button
                                  id="btn-trigger-ai-drafting"
                                  disabled={isDrafting || !draftContext.trim()}
                                  onClick={() => selectDraftMaterial(draftContext, draftType)}
                                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                >
                                  {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-cyan-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                                  Draft New Material
                                </button>
                              </div>
                            </div>

                            {/* Generated Content Box & Interactor */}
                            <div className="md:col-span-8">
                              {currentDraft ? (
                                <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                    <div>
                                      <span className="text-[10px] font-mono uppercase bg-white/10 text-cyan-400 px-2 py-0.5 rounded-lg tracking-wider border border-white/10">
                                        Type: {currentDraft.type}
                                      </span>
                                      <h5 className="text-sm font-bold text-white mt-1.5">{currentDraft.title}</h5>
                                    </div>

                                    <span className="text-[10px] font-mono text-slate-500">
                                      AI AUTOPILOT GENERATED
                                    </span>
                                  </div>

                                  <div className="space-y-4">
                                    {/* Edit Textarea for the body */}
                                    {currentDraft.type === 'prep_doc' ? (
                                      <pre className="text-xs bg-black/50 p-4 border border-white/5 rounded-xl text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">
                                        {currentDraft.content}
                                      </pre>
                                    ) : (
                                      <div className="space-y-3 text-xs">
                                        <div>
                                          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">Send To (Email Address)</label>
                                          <input
                                            type="email"
                                            className="w-full px-3 py-2 bg-black/50 rounded-xl border border-white/10 text-slate-200 outline-none focus:border-cyan-500 transition"
                                            placeholder="recipient@domain.com"
                                            value={emailRecipient}
                                            onChange={(e) => setEmailRecipient(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">Subject</label>
                                          <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-black/50 rounded-xl border border-white/10 text-slate-200 outline-none focus:border-cyan-500 transition"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">Draft Email Body</label>
                                          <textarea
                                            className="w-full h-44 px-3 py-2 bg-black/50 rounded-xl border border-white/10 text-slate-200 outline-none focus:border-cyan-500 font-mono resize-none transition"
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                          />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                          <button
                                            onClick={requestSendEmail}
                                            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                                          >
                                            <Send className="w-3.5 h-3.5 text-black" /> Send Gmail Draft
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 rounded-2xl bg-black/20 border border-white/10 text-center text-xs text-slate-500 flex flex-col justify-center items-center h-full min-h-[250px]">
                                  <ClipboardList className="w-8 h-8 text-slate-700 mb-2" />
                                  Select an email or event threat in the panic tabs, or write a subject context to formulate prework drafts instantly.
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {showSendSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-900/90 hover:bg-emerald-900 border border-emerald-500 rounded-xl max-w-sm flex items-start gap-3 shadow-xl backdrop-blur-md"
            id="success-toast"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Gmail Delivered Successfully!</p>
              <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                The draft response has been legally delivered to the recipient address and saved in your Gmail sent logs.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED DOUBLE-CONFIRMATION MODALS (Safety & Integrity Guideline Requirement) */}
      <AnimatePresence>
        {modalTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
              id="confirmation-modal"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-white/15">
                <div className={`p-2 rounded-xl ${modalTarget === 'calendar' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-500'}`}>
                  {modalTarget === 'calendar' ? <Calendar className="w-5 h-5 animate-pulse" /> : <Mail className="w-5 h-5 animate-pulse" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase tracking-tight font-display">
                    Confirm Action Booking
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">Please review the details below before modifying your data.</p>
                </div>
              </div>

              {/* Calendar booking details */}
              {modalTarget === 'calendar' && calendarPayload && (
                <div className="space-y-3">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Event Title</span>
                      <span className="font-semibold text-slate-200">{calendarPayload.title}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Planned Range</span>
                      <span className="font-mono text-slate-300">
                        {new Date(calendarPayload.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {new Date(calendarPayload.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">AI Rationale</span>
                      <p className="text-slate-400 leading-relaxed italic">"{calendarPayload.rationale}"</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    By confirming, you authorize our assistant to directly insert this focus block event into your primary Google Calendar.
                  </p>
                </div>
              )}

              {/* Email send confirmation details */}
              {modalTarget === 'email' && (
                <div className="space-y-3">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">To Recipient</span>
                      <span className="font-semibold text-slate-200 truncate block">{emailRecipient}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Subject Line</span>
                      <span className="font-semibold text-slate-200">{emailSubject}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    By clicking Confirm, you authorize this tool to send this draft as an active email from your personal account on Gmail.
                  </p>
                </div>
              )}

              {/* Bot buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setModalTarget(null);
                    setCalendarPayload(null);
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl border border-white/10 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-modal-ok"
                  onClick={modalTarget === 'calendar' ? confirmBookCalendar : confirmSendEmail}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simple Footer */}
      <footer className="border-t border-white/10 bg-black/40 py-8 relative">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2 text-xs text-slate-400">
          <p>© 2026. 11th Hour. Powered by Google AI Studio and Gemini 3.5.</p>
          <p className="text-[10px] font-mono text-slate-500">Workspace Direct APIs Secured with Developer Tokens</p>
        </div>
      </footer>

    </div>
  );
}
