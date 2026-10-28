import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ApplicationCategory } from './types';
import { SplashScreen } from './components/SplashScreen';
import { AuthPage } from './components/AuthPage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { auditAndFixOwnerRoles } from './lib/storage';

import { HomePage } from './pages/HomePage';
import { StaffApplyPage } from './pages/StaffApplyPage';
import { ApplicationStatusPage } from './pages/ApplicationStatusPage';
import { AccountPage } from './pages/AccountPage';
import { ReportPage } from './pages/ReportPage';
import { NotificationsPage } from './pages/NotificationsPage';

import { StaffPanel } from './pages/panels/StaffPanel';
import { ModPanel } from './pages/panels/ModPanel';
import { AdminPanel } from './pages/panels/AdminPanel';
import { OwnerPanel } from './pages/panels/OwnerPanel';
import { ThemeProvider } from './context/ThemeContext';

function MainApp() {
  const { currentUser, loading, isStaff, isMod, isAdmin, isOwner } = useAuth();
  
  React.useEffect(() => {
    if (currentUser && isOwner) {
      auditAndFixOwnerRoles().then(count => {
        if (count > 0) console.log(`Removed ${count} unauthorized owner roles.`);
      });
    }
  }, [currentUser, isOwner]);

  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [guestBrowsing, setGuestBrowsing] = useState(false);
  const [applyCategory, setApplyCategory] = useState<ApplicationCategory | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page: string, category?: ApplicationCategory) => {
    setCurrentPage(page);
    setApplyCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSidebarOpen(false);
  };

  const handleSplashComplete = React.useCallback(() => setShowSplash(false), []);

  // 1. SPLASH SCREEN DISPLAY (~2 SECONDS)
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // 2. AUTHENTICATION PAGE (if user is NOT logged in and hasn't chosen guest view)
  if (!loading && !currentUser && !guestBrowsing) {
    return (
      <AuthPage
        onSuccess={() => {
          setGuestBrowsing(false);
          setCurrentPage('home');
        }}
        onContinueAsGuest={() => setGuestBrowsing(true)}
      />
    );
  }

  // 3. MAIN WEBSITE PORTAL WITH PAGE TRANSITIONS
  return (
    <div className="min-h-screen bg-canvas text-main flex flex-col font-sans selection:bg-primary selection:text-white">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {currentPage === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                onOpenAuth={() => setAuthModalOpen(true)}
                isAuthenticated={!!currentUser}
              />
            )}

            {currentPage === 'apply' && (
              <StaffApplyPage
                onNavigate={handleNavigate}
                onOpenAuth={() => setAuthModalOpen(true)}
                defaultCategory={applyCategory}
              />
            )}

            {currentPage === 'status' && (
              <ApplicationStatusPage
                onNavigate={handleNavigate}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            {currentPage === 'account' && <AccountPage />}

            {currentPage === 'reports' && (
              <ReportPage onOpenAuth={() => setAuthModalOpen(true)} />
            )}

            {currentPage === 'notifications' && <NotificationsPage />}

            {/* Role-Based Authorized Panel Access */}
            {currentPage === 'staff-panel' && isStaff && <StaffPanel />}

            {currentPage === 'mod-panel' && isMod && <ModPanel />}

            {currentPage === 'admin-panel' && isAdmin && <AdminPanel />}

            {currentPage === 'owner-panel' && isOwner && <OwnerPanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer onNavigate={handleNavigate} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
