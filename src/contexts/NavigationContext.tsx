/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useState } from 'react';

interface NavigationState {
  returnTo?: string;
  returnLabel?: string;
  breadcrumb?: string[];
  preserveState?: unknown;
}

interface NavigationContextType {
  navigateWithContext: (to: string, context?: NavigationState) => void;
  goBack: () => void;
  getBreadcrumb: () => string[];
  getReturnLabel: () => string | null;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationState] = useState<NavigationState>({});

  const navigateWithContext = (to: string, context?: NavigationState) => {
    setNavigationState(context || {});
    window.location.hash = to;
  };

  const goBack = () => {
    if (navigationState?.returnTo) {
      window.location.hash = navigationState.returnTo;
      setNavigationState((navigationState.preserveState as NavigationState) || {});
    } else {
      window.history.back();
    }
  };

  const getBreadcrumb = () => {
    return navigationState?.breadcrumb || [];
  };

  const getReturnLabel = () => {
    return navigationState?.returnLabel || null;
  };

  return (
    <NavigationContext.Provider value={{
      navigateWithContext,
      goBack,
      getBreadcrumb,
      getReturnLabel
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
