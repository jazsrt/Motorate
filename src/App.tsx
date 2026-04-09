import { useState, useEffect, lazy, Suspense } from 'react';
import { Logo } from './components/Logo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { BadgeProvider, useBadges } from './contexts/BadgeContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { BadgeCelebration } from './components/badges/BadgeCelebration';
import { BadgeIcon } from './components/BadgeIcon';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NewFeedPage } from './pages/NewFeedPage';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { CompletedReviewModal } from './components/CompletedReviewModal';
import { SetHandleModal } from './components/SetHandleModal';
import './index.css';

const CreatePostPage = lazy(() => import('./pages/CreatePostPage').then(m => ({ default: m.CreatePostPage })));
const SpotPage = lazy(() => import('./pages/SpotPage').then(m => ({ default: m.SpotPage })));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage').then(m => ({ default: m.ChallengesPage })));
const RankingsPage = lazy(() => import('./pages/RankingsPage').then(m => ({ default: m.RankingsPage })));
const SafetyPage = lazy(() => import('./pages/SafetyPage').then(m => ({ default: m.SafetyPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage').then(m => ({ default: m.VehicleDetailPage })));
const BuildSheetPage = lazy(() => import('./pages/BuildSheetPage').then(m => ({ default: m.BuildSheetPage })));
const UnifiedSearchPage = lazy(() => import('./pages/UnifiedSearchPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const FollowersPage = lazy(() => import('./pages/FollowersPage').then(m => ({ default: m.FollowersPage })));
const AlbumsPage = lazy(() => import('./pages/AlbumsPage').then(m => ({ default: m.AlbumsPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfServicePage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const InitAdminPage = lazy(() => import('./pages/InitAdminPage'));
const ShadowProfilePage = lazy(() => import('./pages/UnclaimedProfilePage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then(m => ({ default: m.UserProfilePage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const PremiumPage = lazy(() => import('./pages/PremiumPage').then(m => ({ default: m.PremiumPage })));
const MyGaragePage = lazy(() => import('./pages/MyGaragePage').then(m => ({ default: m.MyGaragePage })));
const BadgesPage = lazy(() => import('./pages/BadgesPage').then(m => ({ default: m.BadgesPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ClaimVehiclePage = lazy(() => import('./pages/ClaimVehiclePage').then(m => ({ default: m.ClaimVehiclePage })));

type Page = 'feed' | 'rankings' | 'scan' | 'safety' | 'profile' | 'user-profile' | 'vehicle-detail' | 'build-sheet' | 'create-post' | 'challenges' | 'search' | 'explore' | 'messages' | 'followers' | 'albums' | 'privacy' | 'terms' | 'admin' | 'init-admin' | 'shadow-profile' | 'post-detail' | 'auth-callback' | 'reset-password' | 'events' | 'premium' | 'my-garage' | 'badges' | 'notifications' | 'completed-review' | 'claim-vehicle';
type AuthView = 'login' | 'register';

function parseUrl(): { page: Page | null; params: Record<string, string> } {
  const hash = window.location.hash.slice(1);
  if (!hash) return { page: null, params: {} };

  if (hash.includes('access_token')) {
    return { page: 'auth-callback', params: {} };
  }

  if (hash.includes('type=recovery')) {
    return { page: 'reset-password', params: {} };
  }

  const [path, queryString] = hash.split('?');
  const params: Record<string, string> = {};

  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) params[key] = decodeURIComponent(value);
    });
  }

  const pathParts = path.split('/').filter(Boolean);
  if (pathParts[0] === 'auth' && pathParts[1] === 'callback') {
    return { page: 'auth-callback', params };
  }
  if (pathParts[0] === 'reset-password') {
    return { page: 'reset-password', params };
  }
  if (pathParts[0] === 'vehicle' && pathParts[1]) {
    return { page: 'vehicle-detail', params: { vehicleId: pathParts[1] } };
  }
  if (pathParts[0] === 'post' && pathParts[1]) {
    return { page: 'post-detail', params: { postId: pathParts[1] } };
  }
  if (pathParts[0] === 'shadow' && pathParts[1]) {
    return { page: 'shadow-profile', params: { plateNumber: pathParts[1] } };
  }
  if (pathParts[0] === 'user-profile' && pathParts[1]) {
    return { page: 'user-profile', params: { userId: pathParts[1] } };
  }
  if (pathParts[0] === 'profile' && pathParts[1]) {
    return { page: 'user-profile', params: { userId: pathParts[1] } };
  }

  return { page: null, params: {} };
}

function AppContent() {
  const { user, loading, profile, refreshProfile } = useAuth();
  const { unlockedBadge, dismissBadge } = useBadges();

  const [currentPage, setCurrentPage] = useState<Page>('feed');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [claimingVehicleId, setClaimingVehicleId] = useState<string | undefined>(undefined);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(undefined);
  const [messageRecipientId, setMessageRecipientId] = useState<string | undefined>(undefined);
  const [shadowPlateNumber, setShadowPlateNumber] = useState<string>('');
  const [spotPlateState, setSpotPlateState] = useState<string>('');
  const [spotPlateNumber, setSpotPlateNumber] = useState<string>('');
  const [completedReviewData, setCompletedReviewData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [guestMode, setGuestMode] = useState(false);
  const [vehicleDetailScrollTo, setVehicleDetailScrollTo] = useState<string | undefined>(undefined);
  const [vehicleDetailOpenReviewModal, setVehicleDetailOpenReviewModal] = useState<boolean>(false);
  const [previousPage, setPreviousPage] = useState<Page>('feed');
  const [, setPreviousPageData] = useState<any>(null);
  const [claimData, setClaimData] = useState<any>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const { page, params } = parseUrl();

      if (page === 'auth-callback') {
        setCurrentPage('auth-callback');
      } else if (page === 'reset-password') {
        setCurrentPage('reset-password');
      } else if (page === 'vehicle-detail' && params.vehicleId) {
        setSelectedVehicleId(params.vehicleId);
        setCurrentPage('vehicle-detail');
        setGuestMode(!user);
      } else if (page === 'post-detail' && params.postId) {
        setSelectedPostId(params.postId);
        setCurrentPage('post-detail');
        setGuestMode(!user);
      } else if (page === 'shadow-profile' && params.plateNumber) {
        setShadowPlateNumber(params.plateNumber);
        setCurrentPage('shadow-profile');
        setGuestMode(!user);
      } else if (page === 'user-profile' && params.userId) {
        setSelectedUserId(params.userId);
        setCurrentPage('user-profile');
        setGuestMode(!user);
      } else if (hash && !page) {
        // Handle simple page routes (feed, scan, rankings, etc.)
        const simplePage = hash.split('?')[0].split('/')[0];
        const validPages: Page[] = ['feed', 'rankings', 'scan', 'safety', 'profile', 'create-post', 'challenges', 'search', 'explore', 'messages', 'followers', 'albums', 'privacy', 'terms', 'admin', 'init-admin', 'events', 'premium', 'my-garage', 'badges', 'notifications'];
        if (validPages.includes(simplePage as Page)) {
          setCurrentPage(simplePage as Page);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [user]);




  const handleViewVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentPage('vehicle-detail');
  };

  const handleEditBuildSheet = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentPage('build-sheet');
  };

  const handleNavigate = (page: string, data?: unknown) => {
    const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    if (page === 'shadow-profile' && typeof data === 'string') {
      setPreviousPage(currentPage);
      setShadowPlateNumber(data);
      setCurrentPage('shadow-profile');
    } else if (page === 'vehicle-detail') {
      const vehicleId = typeof data === 'string' ? data : (obj.vehicleId as string | undefined);
      if (vehicleId) {
        setPreviousPage(currentPage);
        setPreviousPageData({ spotPlateState, spotPlateNumber });
        setSelectedVehicleId(vehicleId);
        setVehicleDetailScrollTo(obj.scrollTo as string | undefined);
        setVehicleDetailOpenReviewModal((obj.openReviewModal as boolean) || false);
        setCurrentPage('vehicle-detail');
      }
    } else if (page === 'user-profile') {
      const userId = typeof data === 'string' ? data : (obj.userId as string | undefined);
      if (userId) {
        setPreviousPage(currentPage);
        setSelectedUserId(userId);
        setCurrentPage('user-profile');
      }
    } else if (page === 'completed-review' && data && typeof data === 'object') {
      setCompletedReviewData(obj);
      setCurrentPage('completed-review');
    } else if (page === 'scan') {
      if (data && typeof data === 'object') {
        setSpotPlateState((obj.plateState as string) || '');
        setSpotPlateNumber((obj.plateNumber as string) || '');
      }
      setCurrentPage('scan');
    } else if (page === 'search' && typeof data === 'string') {
      setSearchQuery(data);
      setCurrentPage('search');
    } else if (page === 'claim-vehicle' && data && typeof data === 'object') {
      setClaimData(obj);
      setPreviousPage(currentPage);
      setCurrentPage('claim-vehicle');
    } else {
      setCurrentPage(page as Page);
    }
  };

  const handleSendMessage = (recipientId: string) => {
    setMessageRecipientId(recipientId);
    setCurrentPage('messages');
  };

  if (currentPage === 'auth-callback') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AuthCallbackPage
          onSuccess={() => {
            window.location.hash = '';
            setCurrentPage('feed');
          }}
        />
      </Suspense>
    );
  }

  if (currentPage === 'reset-password') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size="large" />
          <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    if (guestMode && (currentPage === 'vehicle-detail' || currentPage === 'post-detail' || currentPage === 'shadow-profile')) {
      if (currentPage === 'vehicle-detail' && selectedVehicleId) {
        return (
          <Suspense fallback={<LoadingScreen />}>
            <VehicleDetailPage
              vehicleId={selectedVehicleId}
              onNavigate={handleNavigate}
              onBack={() => window.location.hash = ''}
              onEditBuildSheet={handleEditBuildSheet}
              guestMode={true}
            />
          </Suspense>
        );
      }
      if (currentPage === 'shadow-profile' && shadowPlateNumber) {
        return (
          <Suspense fallback={<LoadingScreen />}>
            <ShadowProfilePage
              plateNumber={shadowPlateNumber}
              onNavigate={handleNavigate}
            />
          </Suspense>
        );
      }
      if (currentPage === 'post-detail') {
        return (
          <Suspense fallback={<LoadingScreen />}>
            <NewFeedPage onNavigate={handleNavigate} focusPostId={selectedPostId} />
          </Suspense>
        );
      }
    }

    if (authView === 'register') {
      return (
        <RegisterPage
          onSuccess={() => {
            setCurrentPage('feed');
            setClaimingVehicleId(undefined);
          }}
          onSwitchToLogin={() => {
            setAuthView('login');
            setClaimingVehicleId(undefined);
          }}
          claimingVehicleId={claimingVehicleId}
        />
      );
    }
    return (
      <LoginPage
        onSuccess={() => setCurrentPage('feed')}
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  const isEmailProvider = user.app_metadata?.provider === 'email';
  const isEmailVerified = user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;

  if (user && isEmailProvider && !isEmailVerified) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <VerifyEmailPage />
      </Suspense>
    );
  }

  // Handle gate — OAuth users must pick a handle before using the app
  if (user && profile && !profile.handle) {
    return <SetHandleModal userId={user.id} onComplete={() => refreshProfile()} />;
  }

  // Onboarding gate — new users (especially OAuth) must complete setup before using the app
  if (user && profile && !profile.onboarding_completed) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  let pageContent;

  switch (currentPage) {
    case 'rankings':
      pageContent = <RankingsPage onNavigate={handleNavigate} />;
      break;
    case 'scan':
      pageContent = <SpotPage onNavigate={handleNavigate} />;
      break;
    case 'safety':
      pageContent = <SafetyPage onNavigate={handleNavigate} />;
      break;
    case 'create-post':
      pageContent = <CreatePostPage onNavigate={handleNavigate} />;
      break;
    case 'challenges':
      pageContent = <ChallengesPage onNavigate={handleNavigate} />;
      break;
    case 'search':
      pageContent = <UnifiedSearchPage onNavigate={handleNavigate} onViewVehicle={handleViewVehicle} initialQuery={searchQuery} />;
      break;
    case 'explore':
      pageContent = <UnifiedSearchPage onNavigate={handleNavigate} onViewVehicle={handleViewVehicle} initialQuery={searchQuery} />;
      break;
    case 'messages':
      pageContent = <MessagesPage onNavigate={handleNavigate} recipientId={messageRecipientId} />;
      break;
    case 'followers':
      pageContent = <FollowersPage onNavigate={handleNavigate} />;
      break;
    case 'albums':
      pageContent = <AlbumsPage onNavigate={handleNavigate} />;
      break;
    case 'privacy':
      pageContent = <PrivacyPolicyPage onNavigate={handleNavigate} />;
      break;
    case 'terms':
      pageContent = <TermsOfServicePage onNavigate={handleNavigate} />;
      break;
    case 'admin':
      pageContent = <AdminDashboard onNavigate={handleNavigate} />;
      break;
    case 'init-admin':
      pageContent = <InitAdminPage onNavigate={handleNavigate} />;
      break;
    case 'events':
      pageContent = <EventsPage onNavigate={handleNavigate} />;
      break;
    case 'premium':
      pageContent = <PremiumPage onNavigate={handleNavigate} />;
      break;
    case 'my-garage':
      pageContent = <MyGaragePage onNavigate={handleNavigate} />;
      break;
    case 'badges':
      pageContent = <BadgesPage onNavigate={handleNavigate} />;
      break;
    case 'notifications':
      pageContent = <NotificationsPage onNavigate={handleNavigate} />;
      break;
    case 'profile':
      pageContent = <ProfilePage onNavigate={handleNavigate} onViewVehicle={handleViewVehicle} onSendMessage={handleSendMessage} />;
      break;
    case 'user-profile':
      pageContent = selectedUserId ? (
        <UserProfilePage
          userId={selectedUserId}
          onNavigate={handleNavigate}
          onViewVehicle={handleViewVehicle}
          onBack={() => setCurrentPage(previousPage || 'feed')}
        />
      ) : (
        <UnifiedSearchPage onNavigate={handleNavigate} />
      );
      break;
    case 'vehicle-detail':
      pageContent = selectedVehicleId ? (
        <VehicleDetailPage
          vehicleId={selectedVehicleId}
          onNavigate={handleNavigate}
          onBack={() => {
            setVehicleDetailScrollTo(undefined);
            setVehicleDetailOpenReviewModal(false);
            setCurrentPage(previousPage || 'feed');
          }}
          onEditBuildSheet={handleEditBuildSheet}
          scrollTo={vehicleDetailScrollTo}
          openReviewModal={vehicleDetailOpenReviewModal}
        />
      ) : (
        <ProfilePage onNavigate={handleNavigate} onViewVehicle={handleViewVehicle} />
      );
      break;
    case 'build-sheet':
      pageContent = selectedVehicleId ? (
        <BuildSheetPage
          vehicleId={selectedVehicleId}
          onNavigate={handleNavigate}
          onBack={() => setCurrentPage('vehicle-detail')}
        />
      ) : (
        <ProfilePage onNavigate={handleNavigate} onViewVehicle={handleViewVehicle} />
      );
      break;
    case 'shadow-profile':
      pageContent = shadowPlateNumber ? (
        <ShadowProfilePage
          plateNumber={shadowPlateNumber}
          onNavigate={handleNavigate}
        />
      ) : (
        <NewFeedPage onNavigate={handleNavigate} />
      );
      break;
    case 'completed-review':
      pageContent = <NewFeedPage onNavigate={handleNavigate} />;
      break;
    case 'post-detail':
      pageContent = <NewFeedPage onNavigate={handleNavigate} focusPostId={selectedPostId} />;
      break;
    case 'claim-vehicle':
      pageContent = claimData ? (
        <ClaimVehiclePage onNavigate={handleNavigate} claimData={claimData} />
      ) : (
        <NewFeedPage onNavigate={handleNavigate} />
      );
      break;
    default:
      pageContent = (
        <>
          <NewFeedPage onNavigate={handleNavigate} />
          <PushNotificationPrompt />
          <InstallPrompt />
        </>
      );
      break;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ErrorBoundary>
        {pageContent}
      </ErrorBoundary>
      {unlockedBadge && (
        <BadgeCelebration
          badgeName={unlockedBadge.name}
          badgeDescription={unlockedBadge.description}
          tier={unlockedBadge.level_name?.toLowerCase() === 'platinum' ? 'platinum' : unlockedBadge.level_name?.toLowerCase() === 'gold' ? 'gold' : unlockedBadge.level_name?.toLowerCase() === 'silver' ? 'silver' : 'bronze'}
          icon={<BadgeIcon iconPath={unlockedBadge.icon_path} size={40} alt={unlockedBadge.name} />}
          userHandle={profile?.handle || ''}
          userId={user?.id}
          onClose={dismissBadge}
          onViewBadges={() => { dismissBadge(); handleNavigate('badges'); }}
        />
      )}
      {currentPage === 'completed-review' && completedReviewData && (
        <CompletedReviewModal
          vehicleId={completedReviewData.vehicleId}
          spotType={completedReviewData.spotType}
          wizardData={completedReviewData.wizardData}
          driverRating={completedReviewData.driverRating}
          drivingRating={completedReviewData.drivingRating}
          vehicleRating={completedReviewData.vehicleRating}
          looksRating={completedReviewData.looksRating}
          soundRating={completedReviewData.soundRating}
          conditionRating={completedReviewData.conditionRating}
          sentiment={completedReviewData.sentiment}
          comment={completedReviewData.comment}
          selectedTags={completedReviewData.selectedTags}
          reputationEarned={completedReviewData.reputationEarned}
          isFirstSpot={completedReviewData.isFirstSpot}
          newRank={completedReviewData.newRank}
          rankChange={completedReviewData.rankChange}
          nextBadgeName={completedReviewData.nextBadgeName}
          nextBadgeRemaining={completedReviewData.nextBadgeRemaining}
          userId={user?.id}
          userHandle={profile?.handle || ''}
          onDone={() => {
            setCompletedReviewData(null);
            if (completedReviewData?.vehicleId) {
              setSelectedVehicleId(completedReviewData.vehicleId);
              setPreviousPage('scan');
              setCurrentPage('vehicle-detail');
            } else {
              setCurrentPage('scan');
            }
          }}
          onViewVehicle={(vehicleId) => {
            setCompletedReviewData(null);
            setSelectedVehicleId(vehicleId);
            setPreviousPage('scan');
            setCurrentPage('vehicle-detail');
          }}
          onUpgradeToFull={undefined}
        />
      )}
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BadgeProvider>
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </BadgeProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
