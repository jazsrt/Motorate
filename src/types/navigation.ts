export type NavigationPage =
  | 'feed'
  | 'rankings'
  | 'scan'
  | 'safety'
  | 'profile'
  | 'create-post'
  | 'challenges'
  | 'search'
  | 'messages'
  | 'followers'
  | 'privacy'
  | 'terms'
  | 'admin'
  | 'admin-verifications'
  | 'admin-reports'
  | 'debug-feed';

export type OnNavigate = (page: NavigationPage | string, data?: unknown) => void;
