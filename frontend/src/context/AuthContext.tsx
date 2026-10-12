import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AuthUser } from '../services/api.ts';

export type UserRole =
  | 'patient'
  | 'provider'
  | 'insurance_reviewer'
  | 'insurance_supervisor'
  | 'insurance_admin'
  | 'auditor'
  | 'insurance'; // compatibility alias for insurance reviewers

export interface UserProfile {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isDesignPreview: boolean;
  backendAuthAvailable: boolean;
  isLoadingSession: boolean;
  signIn: (email: string, password: string, roleHint?: UserRole) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  enterDesignPreview: (role: UserRole) => void;
  exitDesignPreview: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthenticated: false,
  isDesignPreview: false,
  backendAuthAvailable: true,
  isLoadingSession: true,
  signIn: async () => ({ success: false, message: '' }),
  signOut: async () => {},
  enterDesignPreview: () => {},
  exitDesignPreview: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isDesignPreview, setIsDesignPreview] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const backendAuthAvailable = true;

  // On mount: Check for active server session via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      try {
        const me: AuthUser = await api.getMe();
        if (isMounted && me && me.email) {
          const mappedRole = (me.role as UserRole) || 'insurance_reviewer';
          setUser({
            id: me.id,
            name: me.full_name,
            email: me.email,
            role: mappedRole,
            organization: me.organization || undefined,
            isActive: me.is_active,
          });
          setRole(mappedRole);
          setIsDesignPreview(false);
          setIsLoadingSession(false);
          return;
        }
      } catch (_) {
        // No active server session found (HTTP 401 or network error)
      }

      // Check if visual design preview was stored for visual evaluation
      if (isMounted) {
        const storedPreview = sessionStorage.getItem('anvesh_design_preview_role') as UserRole | null;
        let previewMode: UserRole | null = storedPreview;

        if (!previewMode && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const isDemo = params.get('demo') === 'true' || params.get('preview') === 'true';
          const urlRole = params.get('role') as UserRole | null;
          if (isDemo && urlRole && ['patient', 'provider', 'insurance', 'insurance_reviewer', 'auditor'].includes(urlRole)) {
            previewMode = urlRole;
            sessionStorage.setItem('anvesh_design_preview_role', previewMode);
          }
        }

        if (previewMode) {
          setRole(previewMode);
          setIsDesignPreview(true);
          setUser({
            id: 'preview-user-01',
            name: `Preview ${previewMode.charAt(0).toUpperCase() + previewMode.slice(1)} User`,
            email: `${previewMode}@preview.local`,
            role: previewMode,
            organization: previewMode.includes('insurance') ? 'National Health Adjudication (Preview)' : 'Metropolitan Health System (Preview)',
          });
        }

        setIsLoadingSession(false);
      }
    }

    checkCurrentSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      if (me) {
        const mappedRole = (me.role as UserRole) || 'insurance_reviewer';
        setUser({
          id: me.id,
          name: me.full_name,
          email: me.email,
          role: mappedRole,
          organization: me.organization || undefined,
          isActive: me.is_active,
        });
        setRole(mappedRole);
        setIsDesignPreview(false);
      }
    } catch (_) {
      setUser(null);
      setRole(null);
    }
  };

  const signIn = async (email: string, password: string, _roleHint?: UserRole) => {
    if (!email.trim() || !password) {
      return {
        success: false,
        message: 'Please provide both your registered email address and password.',
      };
    }

    try {
      const response = await api.login({ email: email.trim(), password });
      const authUser = response.user;
      const verifiedRole = (authUser.role as UserRole) || 'insurance_reviewer';

      setUser({
        id: authUser.id,
        name: authUser.full_name,
        email: authUser.email,
        role: verifiedRole,
        organization: authUser.organization || undefined,
        isActive: authUser.is_active,
      });
      setRole(verifiedRole);
      setIsDesignPreview(false);
      sessionStorage.removeItem('anvesh_design_preview_role');

      return {
        success: true,
        message: response.message || 'Signed in successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Authentication failed. Please check your credentials.',
      };
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch (_) {
      // Always clear local client state even if backend network call fails
    }
    setUser(null);
    setRole(null);
    setIsDesignPreview(false);
    sessionStorage.removeItem('anvesh_design_preview_role');
  };

  const enterDesignPreview = (previewRole: UserRole) => {
    setRole(previewRole);
    setIsDesignPreview(true);
    setUser({
      id: 'preview-user-01',
      name: `Preview ${previewRole.charAt(0).toUpperCase() + previewRole.slice(1)} User`,
      email: `${previewRole}@preview.local`,
      role: previewRole,
      organization: previewRole.includes('insurance') ? 'ANVESH Claims Review (Preview)' : 'Regional Care Center (Preview)',
    });
    sessionStorage.setItem('anvesh_design_preview_role', previewRole);
  };

  const exitDesignPreview = () => {
    signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user && !isDesignPreview,
        isDesignPreview,
        backendAuthAvailable,
        isLoadingSession,
        signIn,
        signOut,
        enterDesignPreview,
        exitDesignPreview,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
