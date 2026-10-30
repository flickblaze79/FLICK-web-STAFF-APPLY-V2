import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../lib/auditLogger';
import {
  getApplications,
  getReports,
  fetchReports,
  fetchUsersFromFirestore,
  fetchApplicationsFromFirestore,
  fetchAuditLogsFromFirestore,
  updateApplication,
  updateReport,
  toggleSaveReport,
  deleteReport,
  addNotification,
  saveSystemSettings,
  fetchSystemSettings,
  fetchGlobalStats,
  updateUserRole,
  deleteAllApplications,
} from '../../lib/storage';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { StaffApplication, UserProfile, UserRole, UserReport, AuditLogEntry, QUESTIONS, ApplicationCategory, SystemSettings } from '../../types';
import { UserProfileDetailModal } from './UserProfileDetailModal';
import { ReportMediaPreview } from '../../components/ReportMediaPreview';
import { SystemHealthPanel } from '../../components/SystemHealthPanel';
import { checkAndProcessAutoRejections } from '../../lib/autoReject';
import {
  Crown,
  Users,
  FileText,
  Search,
  Activity,
  Award,
  Eye,
  AlertCircle,
  Clock,
  RefreshCw,
  BarChart3,
  ClipboardList,
  Settings,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Video,
  Image as ImageIcon,
  FileQuestion,
  Hammer,
  Shield,
  HelpCircle,
  Bookmark,
  Trash2,
  Loader2,
  AlertTriangle,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const OwnerPanel: React.FC = () => {
  const { currentUser, userProfile: currentUserProfile, isOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'reports' | 'applications' | 'settings'>('dashboard');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemSettings, setSystemSettingsState] = useState<SystemSettings | null>(null);
  const [updatingCategories, setUpdatingCategories] = useState<Record<string, boolean>>({});
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApps: 0,
    underReviewApps: 0,
    acceptedApps: 0,
    rejectedApps: 0,
    openReports: 0,
    resolvedReports: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [inspectUser, setSelectedInspectUser] = useState<UserProfile | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [appCategoryFilter, setAppCategoryFilter] = useState<string>('All');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('All');
  const [reportFilter, setReportFilter] = useState<string>('All');
  const [reportSearch, setReportSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [reviewNote, setReviewNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<UserReport | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const [firestoreRole, setFirestoreRole] = useState<string>('Loading...');
  const [verifyingOwner, setVerifyingOwner] = useState<boolean>(false);

  const checkFirestoreRole = async () => {
    if (!currentUser?.uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setFirestoreRole(data.role || 'UNKNOWN');
      } else {
        setFirestoreRole('Document Not Found');
      }
    } catch (err) {
      setFirestoreRole('Error Fetching');
    }
  };

  const handleVerifyOwner = async () => {
    if (!currentUser) return;
    setVerifyingOwner(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      let role = snap.exists() ? snap.data().role : null;

      if (currentUser.email?.toLowerCase() === 'flickblaze7@gmail.com' || currentUser.uid === 'NtQwPhiWQpRRnq2klOAKnSWoQKi1') {
        if (role !== 'OWNER') {
          console.log('[Diagnostic] Forcing OWNER role assignment for authorized owner UID/email');
          await updateUserRole(currentUser.uid, 'OWNER', 'DIAGNOSTIC_PANEL_VERIFY');
          role = 'OWNER';
        }
      }
      setFirestoreRole(role || 'UNKNOWN');
      alert(`Diagnostic Verification Successful!\nAuth UID: ${currentUser.uid}\nFirestore Role: ${role}\nEmail: ${currentUser.email}`);
      window.location.reload();
    } catch (err: any) {
      alert('Verification error: ' + (err?.message || 'Unknown error'));
    } finally {
      setVerifyingOwner(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkFirestoreRole();
    }
  }, [currentUser]);

  const loadOwnerData = async () => {
    setLoadingInitial(true);
    try {
      await checkAndProcessAutoRejections();
      
      const [uList, aList, rList, lList, settings, liveStats] = await Promise.all([
        fetchUsersFromFirestore(),
        fetchApplicationsFromFirestore(),
        fetchReports(),
        fetchAuditLogsFromFirestore(),
        fetchSystemSettings(),
        fetchGlobalStats()
      ]);

      setUsers(uList);
      aList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setApplications(aList);
      rList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(rList);
      lList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(lList);
      setSystemSettingsState(settings);
      setStats(liveStats);
    } catch (err) {
      console.error('Error loading Owner Panel data:', err);
    } finally {
      setLoadingInitial(false);
      setLoadingStats(false);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent, report: UserReport) => {
    e.stopPropagation();
    if (!currentUser || !report.id || savingReportId === report.id) return;
    setSavingReportId(report.id);
    try {
      const res = await toggleSaveReport(report.id, currentUser.uid);
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? (res.updatedReport || r) : r))
      );
      if (selectedReport?.id === report.id && res.updatedReport) {
        setSelectedReport(res.updatedReport);
      }
    } catch (err: any) {
      console.error('Failed to toggle save report:', err);
      alert('Could not update saved status: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingReportId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete || !reportToDelete.id || !currentUser || deletingReportId) return;
    const targetId = reportToDelete.id;
    setDeletingReportId(targetId);
    setDeleteError(null);
    try {
      await deleteReport(targetId, {
        uid: currentUser.uid,
        name: currentUserProfile?.name || currentUser.displayName || 'Owner',
        email: currentUser.email || '',
        role: 'OWNER',
      });
      setReports((prev) => prev.filter((r) => r.id !== targetId));
      if (selectedReport?.id === targetId) {
        setSelectedReport(null);
      }
      setReportToDelete(null);
    } catch (err: any) {
      console.error('Delete report error:', err);
      setDeleteError(err?.message || 'Failed to delete report. Please try again.');
    } finally {
      setDeletingReportId(null);
    }
  };

  useEffect(() => {
    if (isOwner) loadOwnerData();
  }, [isOwner]);

  const handleDecision = async (appId: string, status: 'Accepted' | 'Rejected' | 'Under Review') => {
    if (!currentUser || processingId === appId) return;
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;
    setProcessingId(appId);
    try {
      const decisionAt = new Date().toISOString();
      await updateApplication(appId, {
        status,
        reviewerUid: currentUser.uid,
        reviewerRole: 'OWNER',
        reviewNotes: reviewNote.trim() || targetApp.reviewNotes || '',
        decisionAt,
        updatedAt: decisionAt,
      });
      if (status === 'Accepted' || status === 'Rejected') {
        await addNotification({
          recipientUid: targetApp.applicantUid,
          title: `Application Decision: ${status}`,
          message: `Your application for ${targetApp.position} status was marked as ${status} by Owner.`,
          type: 'application',
          read: false,
          createdAt: decisionAt,
        });
      }
      await logAuditEvent({
        action: `OWNER_DECISION_${status.toUpperCase()}`,
        actorUid: currentUser.uid,
        actorName: currentUserProfile?.name || 'Owner',
        actorEmail: currentUser.email || '',
        actorRole: 'OWNER',
        targetResource: 'applications',
        targetUid: appId,
        metadata: { position: targetApp.position, status },
      });
      await loadOwnerData();
      alert(`Application marked as ${status}.`);
      setReviewNote('');
    } catch (err: any) {
      console.error('Decision error:', err);
      alert('Failed to update application.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleCategory = async (cat: ApplicationCategory) => {
    if (!systemSettings || updatingCategories[cat]) return;
    const currentValue = systemSettings.categoryToggles[cat];
    const newValue = !currentValue;
    
    // Update local state immediately for snappy UI
    const previousToggles = { ...systemSettings.categoryToggles };
    const updatedToggles = { ...previousToggles, [cat]: newValue };
    
    setSystemSettingsState(prev => prev ? {
      ...prev,
      categoryToggles: updatedToggles
    } : null);
    
    setUpdatingCategories(prev => ({ ...prev, [cat]: true }));
    try {
      await saveSystemSettings({ categoryToggles: updatedToggles });
      
      await logAuditEvent({
        action: `CATEGORY_TOGGLE_${cat.toUpperCase().replace(' ', '_')}`,
        actorUid: currentUser?.uid || '',
        actorName: currentUserProfile?.name || 'Owner',
        actorEmail: currentUser?.email || '',
        actorRole: 'OWNER',
        targetResource: 'system_settings',
        metadata: { category: cat, enabled: newValue },
      });
      
      // Success - no alert needed as UI reflects state
    } catch (err) {
      console.error('Toggle error:', err);
      // Revert local state on failure
      setSystemSettingsState(prev => prev ? {
        ...prev,
        categoryToggles: previousToggles
      } : null);
      alert('Failed to update category setting. Reverting to previous state.');
    } finally {
      setUpdatingCategories(prev => ({ ...prev, [cat]: false }));
    }
  };

  const activeApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch = app.applicantName.toLowerCase().includes(appSearch.toLowerCase()) || app.applicantEmail.toLowerCase().includes(appSearch.toLowerCase());
      
      const matchCategory = appCategoryFilter === 'All' || app.category === appCategoryFilter;
      
      const matchStatus = appStatusFilter === 'All'
        ? (app.status === 'Pending' || app.status === 'Under Review')
        : app.status === appStatusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [applications, appSearch, appCategoryFilter, appStatusFilter]);

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const matchSearch = rep.subject.toLowerCase().includes(reportSearch.toLowerCase());
      if (reportFilter === 'Saved') return matchSearch && !!currentUser && Array.isArray(rep.savedBy) && rep.savedBy.includes(currentUser.uid);
      if (reportFilter === 'Video') return matchSearch && !!rep.videoLink;
      if (reportFilter === 'Photo') return matchSearch && !!rep.evidenceUrl;
      if (reportFilter === 'Basic') return matchSearch && !rep.videoLink && !rep.evidenceUrl;
      return matchSearch;
    });
  }, [reports, reportSearch, reportFilter, currentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, roleFilter]);

  if (!isOwner) return <div className="max-w-md mx-auto py-20 text-center text-red-300 bg-panel border border-red-900/50 rounded-2xl p-8 mt-10 shadow-2xl">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-secondary/20 pb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-widest">
            <Crown className="w-5 h-5" />
            <span>Supreme Ownership — Flick Staff Apply V2</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase mt-2 italic tracking-tight">Owner Command</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2 bg-panel p-1.5 rounded-2xl border border-secondary/30">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-slate-300 hover:text-white'}`}>
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-slate-300 hover:text-white'}`}>
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'reports' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-slate-300 hover:text-white'}`}>
            <AlertTriangle className="w-4 h-4" />
            <span>Reports</span>
          </button>
          <button onClick={() => setActiveTab('applications')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'applications' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-slate-300 hover:text-white'}`}>
            <FileText className="w-4 h-4" />
            <span>Applications</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-slate-300 hover:text-white'}`}>
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dash" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
            <div className="bg-panel border border-amber-400/40 rounded-[2rem] p-6 shadow-2xl space-y-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5"><Crown className="w-32 h-32 text-amber-300" /></div>
               <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                  <div className="space-y-1">
                     <div className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Owner Security & Role Diagnostic Panel
                     </div>
                     <div className="text-xs text-slate-300 font-mono">Auth UID: <span className="text-cyan-400">{currentUser?.uid || 'N/A'}</span></div>
                     <div className="text-xs text-slate-300 font-mono">Firestore Document Role: <span className="text-emerald-400 font-bold">{firestoreRole}</span></div>
                     <div className="text-xs text-slate-300 font-mono">Email: <span className="text-white">{currentUser?.email || 'N/A'}</span></div>
                  </div>
                  <button
                     onClick={handleVerifyOwner}
                     disabled={verifyingOwner}
                     className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                     {verifyingOwner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                     <span>Verify Owner</span>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-panel border border-secondary/30 p-6 rounded-3xl space-y-2 shadow-xl hover:border-amber-400/20 transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Users</span>
                <div className="text-3xl font-black text-white">{loadingStats ? '...' : stats.totalUsers}</div>
              </div>
              <div className="bg-panel border border-secondary/30 p-6 rounded-3xl space-y-2 shadow-xl hover:border-cyan-400/20 transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Queue</span>
                <div className="text-3xl font-black text-cyan-400">{loadingStats ? '...' : stats.pendingApps + stats.underReviewApps}</div>
              </div>
              <div className="bg-panel border border-secondary/30 p-6 rounded-3xl space-y-2 shadow-xl hover:border-amber-400/20 transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Reports</span>
                <div className="text-3xl font-black text-amber-300">{loadingStats ? '...' : stats.openReports}</div>
              </div>
              <div className="bg-panel border border-secondary/30 p-6 rounded-3xl space-y-2 shadow-xl hover:border-emerald-400/20 transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accepted Staff</span>
                <div className="text-3xl font-black text-emerald-400">{loadingStats ? '...' : stats.acceptedApps}</div>
              </div>
            </div>

            <SystemHealthPanel />

            <div className="bg-panel border border-secondary/30 rounded-[2rem] p-6 space-y-4 shadow-2xl">
               <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 px-2"><Activity className="w-5 h-5 text-amber-300" /> Recent System Audit</h3>
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="p-4 bg-canvas/60 rounded-2xl border border-secondary/10 flex items-center justify-between text-[11px] group hover:bg-canvas transition-all">
                       <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-white group-hover:text-amber-300 transition-colors">{log.actorName} <span className="text-slate-500 font-medium">({log.actorRole})</span></span>
                          <span className="text-amber-400 font-bold uppercase">{log.action}</span>
                       </div>
                       <span className="text-slate-500 font-mono italic">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-panel border border-secondary/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name, email, or UID..." className="w-full bg-canvas border border-secondary/30 rounded-2xl py-3 pl-12 pr-4 text-xs text-white outline-none focus:border-amber-400" />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-canvas border border-secondary/30 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer">
                <option value="All">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MOD">Moderator</option>
                <option value="STAFF">Staff</option>
                <option value="USER">User</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredUsers.map(u => (
                  <div key={u.uid} className="bg-panel border border-secondary/30 rounded-[1.5rem] p-5 flex items-center justify-between group hover:border-amber-400/40 transition-all shadow-lg hover:shadow-amber-400/5">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-black text-white shadow-xl border border-secondary/30 overflow-hidden shrink-0">
                           {u.photoURL ? <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                           <div className="text-sm font-black text-white truncate">{u.name}</div>
                           <div className="text-[10px] text-slate-500 font-mono truncate">{u.role}</div>
                        </div>
                     </div>
                     <button onClick={() => setSelectedInspectUser(u)} className="p-2.5 bg-canvas hover:bg-amber-400 hover:text-black rounded-xl border border-secondary/30 transition-all shrink-0"><Eye className="w-4 h-4" /></button>
                  </div>
               ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && (
           <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-panel border border-secondary/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center gap-6">
                 <div className="flex items-center gap-3 w-full md:w-auto">
                    <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="bg-canvas border border-secondary/30 rounded-xl px-4 py-2 text-[11px] font-black text-white outline-none cursor-pointer pr-10 appearance-none min-w-[160px]">
                       <option value="All">All</option>
                       <option value="Saved">Saved</option>
                       <option value="Basic">Basic</option>
                       <option value="Video">Video</option>
                       <option value="Photo">Photo</option>
                    </select>
                 </div>
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="Search reports..." className="w-full bg-canvas border border-secondary/30 rounded-2xl py-2.5 pl-12 pr-4 text-xs text-white outline-none focus:border-amber-400" />
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {filteredReports.length === 0 ? (
                    <div className="bg-panel border border-secondary/30 rounded-3xl p-12 text-center text-slate-500 font-bold uppercase text-xs">
                       {reportFilter === 'Saved' ? 'No saved reports for later' : 'No reports match criteria'}
                    </div>
                 ) : (
                    filteredReports.map(r => (
                       <div key={r.id} className="bg-panel border border-secondary/30 rounded-[2rem] p-6 shadow-2xl hover:border-amber-400/20 transition-all flex flex-col sm:flex-row justify-between gap-6">
                          <div className="space-y-3 flex-1">
                             <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${r.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'}`}>{r.status}</span>
                                {currentUser && r.savedBy?.includes(currentUser.uid) && (
                                   <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1">
                                      <Bookmark className="w-3 h-3 fill-amber-300" /> Saved
                                   </span>
                                )}
                                <h4 className="text-base font-black text-white uppercase">{r.subject}</h4>
                             </div>
                             <p className="text-xs text-slate-300 italic bg-canvas/40 p-4 rounded-2xl border border-secondary/10 leading-relaxed">"{r.description}"</p>
                             <div className="flex gap-4 text-[10px] font-bold text-slate-500">
                                <span>REPORTER: <span className="text-white">{r.authorName}</span></span>
                                <span>DATE: <span className="text-white">{new Date(r.createdAt).toLocaleDateString()}</span></span>
                             </div>
                          </div>
                          <div className="flex flex-col gap-3 shrink-0 min-w-[150px]">
                             <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 py-2 px-3 bg-canvas/60 rounded-xl border border-secondary/20 flex-1 justify-center">
                                   {r.videoLink && <Video className="w-4 h-4 text-indigo-400" />}
                                   {r.evidenceUrl && <ImageIcon className="w-4 h-4 text-cyan-400" />}
                                   {!r.videoLink && !r.evidenceUrl && <FileText className="w-4 h-4 text-slate-600" />}
                                </div>
                                <div className="flex items-center gap-1">
                                   <button
                                      onClick={(e) => handleToggleSave(e, r)}
                                      disabled={savingReportId === r.id}
                                      title={currentUser && r.savedBy?.includes(currentUser.uid) ? 'Remove from Saved' : 'Save for Later'}
                                      className={`p-2 rounded-xl border transition-all ${
                                         currentUser && r.savedBy?.includes(currentUser.uid)
                                            ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                                            : 'bg-canvas border-secondary/30 text-slate-400 hover:text-amber-300 hover:border-amber-500/30'
                                      }`}
                                   >
                                      <Bookmark className={`w-4 h-4 ${currentUser && r.savedBy?.includes(currentUser.uid) ? 'fill-amber-300' : ''}`} />
                                   </button>
                                   <button
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         setReportToDelete(r);
                                         setDeleteError(null);
                                      }}
                                      title="Delete Report"
                                      className="p-2 bg-canvas hover:bg-red-950/60 border border-secondary/30 hover:border-red-500/40 text-slate-400 hover:text-red-400 rounded-xl transition-all"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             </div>
                             <button onClick={() => setSelectedReport(r)} className="w-full py-2 bg-canvas hover:bg-amber-400 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-wider border border-secondary/35 transition-all">Review</button>
                             <button onClick={() => {
                                updateReport(r.id!, { status: r.status === 'Resolved' ? 'Open' : 'Resolved' });
                                loadOwnerData();
                             }} className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md ${r.status === 'Resolved' ? 'bg-canvas text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                                {r.status === 'Resolved' ? 'Re-open' : 'Mark Resolved'}
                             </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </motion.div>
        )}

        {activeTab === 'applications' && (
           <motion.div key="applications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-panel border border-secondary/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row gap-4">
                 <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <select value={appCategoryFilter} onChange={(e) => setAppCategoryFilter(e.target.value)} className="bg-canvas border border-secondary/30 rounded-xl pl-9 pr-8 py-2.5 text-[11px] font-black text-white outline-none cursor-pointer appearance-none min-w-[180px] focus:border-amber-400/50">
                        <option value="All">📋 All Categories</option>
                        <option value="Developer Apply">💻 Developer Apply</option>
                        <option value="Staff Apply">🛡️ Staff Apply</option>
                        <option value="Moderator Apply">🔨 Moderator Apply</option>
                        <option value="Helper Apply">❓ Helper Apply</option>
                      </select>
                    </div>
                    
                    <div className="relative">
                      <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)} className="bg-canvas border border-secondary/30 rounded-xl pl-9 pr-8 py-2.5 text-[11px] font-black text-white outline-none cursor-pointer appearance-none pr-10 focus:border-amber-400/50">
                        <option value="All">📋 All Applications</option>
                        <option value="Pending">⏳ Pending</option>
                        <option value="Under Review">🔍 Under Review</option>
                        <option value="Accepted">✅ Accepted</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    </div>
                 </div>
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={appSearch} onChange={(e) => setAppSearch(e.target.value)} placeholder="Search applicants..." className="w-full bg-canvas border border-secondary/30 rounded-2xl py-2.5 pl-12 pr-4 text-xs text-white outline-none focus:border-amber-400" />
                 </div>
              </div>
              <div className="space-y-4">
                 {activeApplications.map(app => (
                    <div key={app.id} className="bg-panel border border-secondary/30 rounded-[2rem] p-6 sm:p-8 shadow-2xl hover:border-cyan-400/20 transition-all space-y-6">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary/20 pb-4">
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-slate-500">ID: {app.id}</span>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 uppercase">{app.status}</span>
                             </div>
                             <h4 className="text-xl font-black text-white uppercase tracking-tight">{app.applicantName} <span className="text-slate-500 font-medium text-sm">({app.discordUsername})</span></h4>
                          </div>
                          <span className="px-3 py-1 bg-canvas border border-secondary/30 rounded-xl text-[10px] font-black text-cyan-400 uppercase">{app.category}</span>
                       </div>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">Top Responses</span>
                             {QUESTIONS[app.category]?.slice(0, 3).map((q, i) => (
                                <div key={i} className="p-4 bg-canvas/40 rounded-2xl border border-secondary/10 space-y-1">
                                   <div className="text-[9px] font-black text-cyan-500 uppercase">Q: {q}</div>
                                   <div className="text-xs text-slate-300 font-medium italic">"{app.answers[i.toString()] || 'N/A'}"</div>
                                </div>
                             ))}
                          </div>
                          <div className="space-y-4">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">Management Actions</span>
                             <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Decision notes..." rows={3} className="w-full bg-canvas border border-secondary/30 rounded-2xl p-4 text-xs text-white outline-none focus:border-amber-400 shadow-inner" />
                             <div className="flex gap-2">
                                <button onClick={() => handleDecision(app.id!, 'Under Review')} disabled={processingId === app.id} className="flex-1 py-3 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 rounded-xl text-[10px] font-black uppercase transition-all">Review</button>
                                <button onClick={() => handleDecision(app.id!, 'Accepted')} disabled={processingId === app.id} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg">Accept</button>
                                <button onClick={() => handleDecision(app.id!, 'Rejected')} disabled={processingId === app.id} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg">Reject</button>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </motion.div>
        )}

        {activeTab === 'settings' && (
           <motion.div key="settings" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto py-8">
              <div className="bg-panel border border-secondary/30 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5"><Settings className="w-40 h-40" /></div>
                 <div className="relative space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Portal Configuration</h3>
                    <p className="text-sm text-slate-400 font-medium">Toggle recruitment availability globally.</p>
                 </div>
                 <div className="grid grid-cols-1 gap-3">
                    {(['Developer Apply', 'Staff Apply', 'Moderator Apply', 'Helper Apply'] as ApplicationCategory[]).map(cat => {
                       const enabled = systemSettings?.categoryToggles[cat] !== false;
                       return (
                          <div key={cat} className="flex items-center justify-between p-5 bg-canvas/60 rounded-2xl border border-secondary/10 group hover:border-amber-400/40 transition-all shadow-sm">
                             <div className="flex items-center gap-4">
                                <div className={`p-3.5 rounded-xl ${enabled ? 'bg-primary/20 text-cyan-400 border border-cyan-400/30 shadow-cyan-400/5' : 'bg-canvas text-slate-600 border border-secondary/20'} border transition-all`}>
                                   {cat === 'Developer Apply' ? <Activity className="w-5 h-5" /> : cat === 'Staff Apply' ? <Shield className="w-5 h-5" /> : cat === 'Moderator Apply' ? <Hammer className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                   <div className="text-sm font-black text-white uppercase tracking-wide">{cat}</div>
                                   <div className={`text-[9px] font-black uppercase tracking-widest ${enabled ? 'text-emerald-400' : 'text-slate-500'}`}>{enabled ? 'OPEN' : 'CLOSED'}</div>
                                </div>
                             </div>
                             <button 
                                onClick={() => handleToggleCategory(cat)} 
                                disabled={updatingCategories[cat]}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700 shadow-inner'} ${updatingCategories[cat] ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                                {updatingCategories[cat] ? (
                                   <RefreshCw className="w-4 h-4 text-white animate-spin mx-auto" />
                                ) : (
                                   <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-md ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                )}
                             </button>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {inspectUser && (
        <UserProfileDetailModal
          user={inspectUser}
          isOpen={!!inspectUser}
          onClose={() => setSelectedInspectUser(null)}
          onProfileUpdated={() => loadOwnerData()}
        />
      )}
      {selectedReport && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-panel border border-secondary/40 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
               <button onClick={() => setSelectedReport(null)} className="absolute top-6 right-6 p-2 hover:bg-canvas rounded-xl"><ChevronRight className="w-6 h-6 rotate-180" /></button>
               <div className="space-y-6">
                  <div className="flex items-center gap-2 flex-wrap">
                     <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${selectedReport.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'}`}>{selectedReport.status}</span>
                     {currentUser && selectedReport.savedBy?.includes(currentUser.uid) && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1">
                           <Bookmark className="w-3 h-3 fill-amber-300" /> Saved for Later
                        </span>
                     )}
                     <h3 className="text-2xl font-black text-white uppercase">{selectedReport.subject}</h3>
                  </div>
                  <div className="p-5 bg-canvas/60 rounded-2xl border border-secondary/20 text-sm text-slate-200 italic">"{selectedReport.description}"</div>
                  
                  <ReportMediaPreview evidenceUrl={selectedReport.evidenceUrl} videoLink={selectedReport.videoLink} />

                  <div className="flex gap-4 text-[10px] font-bold text-slate-500 pt-2 border-t border-secondary/20">
                     <span>REPORTER: <span className="text-white">{selectedReport.authorName}</span></span>
                     <span>DATE: <span className="text-white">{new Date(selectedReport.createdAt).toLocaleDateString()}</span></span>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4">
                     <button
                        onClick={(e) => handleToggleSave(e, selectedReport)}
                        disabled={savingReportId === selectedReport.id}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                           currentUser && selectedReport.savedBy?.includes(currentUser.uid)
                              ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                              : 'bg-canvas border-secondary/30 text-slate-300 hover:text-amber-300'
                        }`}
                     >
                        <Bookmark className={`w-4 h-4 ${currentUser && selectedReport.savedBy?.includes(currentUser.uid) ? 'fill-amber-300' : ''}`} />
                        <span>{currentUser && selectedReport.savedBy?.includes(currentUser.uid) ? 'Saved for Later' : 'Save for Later'}</span>
                     </button>
                     <button onClick={async () => {
                        await updateReport(selectedReport.id!, { status: selectedReport.status === 'Resolved' ? 'Open' : 'Resolved' });
                        setSelectedReport(null);
                        loadOwnerData();
                     }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg ${selectedReport.status === 'Resolved' ? 'bg-canvas text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                        {selectedReport.status === 'Resolved' ? 'Mark Open' : 'Mark Resolved'}
                     </button>
                     <button
                        onClick={() => {
                           setReportToDelete(selectedReport);
                           setDeleteError(null);
                        }}
                        className="px-4 py-3 bg-red-950/50 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5"
                     >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                     </button>
                  </div>

               </div>
            </motion.div>
         </div>
      )}

      {/* Owner Report Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-panel border border-red-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-950/80 rounded-2xl border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Delete Report</h3>
                <span className="text-[10px] text-red-400/90 font-bold uppercase tracking-wider">Permanent Action</span>
              </div>
            </div>

            <div className="space-y-3 bg-canvas/60 p-4 rounded-2xl border border-secondary/20">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                Are you sure you want to delete this report? This will permanently remove it from the active report system and delete any uploaded evidence media from Firebase Storage.
              </p>
              <div className="text-[11px] font-mono text-slate-400 border-t border-secondary/20 pt-2 space-y-1">
                <div><span className="text-slate-500 uppercase">Subject:</span> <span className="text-white font-bold">{reportToDelete.subject}</span></div>
                <div><span className="text-slate-500 uppercase">Reporter:</span> <span className="text-slate-300">{reportToDelete.authorName}</span></div>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-950/90 border border-red-600 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReportToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deletingReportId !== null}
                className="flex-1 py-3 bg-canvas hover:bg-slate-800 border border-secondary/30 rounded-xl text-xs font-black uppercase text-slate-300 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingReportId !== null}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deletingReportId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
