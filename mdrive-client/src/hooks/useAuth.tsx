import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getAuthState as tauriGetAuthState,
  saveTokens as tauriSaveTokens,
  clearTokens as tauriClearTokens,
  cancelAllUploads,
} from "../lib/tauri";
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  setToken,
  clearCachedToken,
  refreshApiState,
} from "../lib/api";

interface User {
  _id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }) => Promise<{ isFirstUser: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const state = await tauriGetAuthState();
      if (state.is_authenticated && state.access_token) {
        setToken(state.access_token);
        await refreshApiState();
        const res = await getMe();
        if (res.data) {
          setUser(res.data);
        } else {
          // Token expired or invalid
          await tauriClearTokens();
          clearCachedToken();
        }
      }
    } catch {
      // Not authenticated
      await tauriClearTokens();
      clearCachedToken();
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    await refreshApiState();
    const res = await apiLogin(email, password);
    if (res.data) {
      const { user: userData, tokens } = res.data;
      await tauriSaveTokens(tokens.accessToken, tokens.refreshToken);
      setToken(tokens.accessToken);
      setUser(userData);
    }
  }, []);

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      displayName: string;
      role?: string;
    }): Promise<{ isFirstUser: boolean }> => {
      await refreshApiState();
      const res = await apiRegister(params);

      if (res.data && "tokens" in res.data) {
        // First user — got auto-login tokens
        const { user: userData, tokens } = res.data;
        await tauriSaveTokens(tokens.accessToken, tokens.refreshToken);
        setToken(tokens.accessToken);
        setUser(userData);
        return { isFirstUser: true };
      }

      return { isFirstUser: false };
    },
    []
  );

  const logout = useCallback(async () => {
    await cancelAllUploads();
    await tauriClearTokens();
    clearCachedToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
