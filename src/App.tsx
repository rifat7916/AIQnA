import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, FileText, Settings, LogOut, ShieldAlert, Moon, Sun, User as UserIcon } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import GeneratePage from './pages/GeneratePage';
import MyDocumentsPage from './pages/MyDocumentsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// Auth Context
export const AuthContext = React.createContext<any>(null);

function GlobalHeader() {
  const { user, logout } = useContext(AuthContext);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Tagline */}
          <Link to="/" className="flex flex-col justify-center">
            <div className="flex items-center">
              <span className="text-2xl font-extrabold tracking-tight">
                <span className="text-indigo-600 dark:text-indigo-400">AI</span>
                <span className="text-black dark:text-white">QnA</span>
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              Smart Questions. Instant Answers.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/generate" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Generate</Link>
                <Link to="/documents" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">My Documents</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors">Admin</Link>
                )}
                
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                  {user.role === 'user' && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {Math.max(0, 4 - (user.generation_count || 0))}/4 left
                    </span>
                  )}
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <div className="relative group">
                    <button className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                          {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.username || user.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                      </div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Link to="/login" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Sign In</Link>
                <Link to="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors shadow-sm">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {user ? (
              <>
                <Link to="/generate" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Generate</Link>
                <Link to="/documents" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">My Documents</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">Admin Dashboard</Link>
                )}
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Sign In</Link>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function GlobalFooter() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          <span className="font-bold">
            <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            <span className="text-black dark:text-white">QnA</span>
          </span> | Smart Questions. Instant Answers.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          Designed and developed by Rifat
        </p>
      </div>
    </footer>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <GlobalHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <GlobalFooter />
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAuthReady } = useContext(AuthContext);
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/generate" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() });
        } else {
          // Create new user document if it doesn't exist
          const isRifat = firebaseUser.email === 'rifat@aiqna.app' || firebaseUser.email === 'raifathai17@gmail.com';
          const newUser = {
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || null,
            role: isRifat ? 'admin' : 'user', // Default role
            generation_count: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(userDocRef, newUser);
          } catch (e) {
            console.error("Error creating user doc:", e);
          }
          setUser({ uid: firebaseUser.uid, ...newUser });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithUsername = async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@aiqna.app`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // Automatically create the admin account if it doesn't exist and credentials match
      if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && username.toLowerCase().trim() === 'rifat' && password === 'rifat7916') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          const newUser = {
            email: email,
            username: username.trim(),
            photoURL: null,
            role: 'admin',
            generation_count: 0,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newUser, { merge: true });
          setUser({ uid: userCredential.user.uid, ...newUser });
        } catch (regError: any) {
          if (regError.code === 'auth/email-already-in-use') {
            throw new Error('Admin account already exists with your previous password (rifat123). Please log in using your original password.');
          }
          throw regError;
        }
      } else {
        throw error;
      }
    }
  };

  const registerWithUsername = async (username: string, password: string) => {
    if (username.toLowerCase().trim() === 'rifat') {
      throw new Error('This username is reserved. Please use a different username.');
    }
    const email = `${username.toLowerCase().trim()}@aiqna.app`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create new user document immediately
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const newUser = {
      email: email,
      username: username.trim(),
      photoURL: null,
      role: 'user',
      generation_count: 0,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(userDocRef, newUser, { merge: true });
    } catch (e) {
      console.error("Error in registerWithUsername setDoc:", e);
    }
    setUser({ uid: userCredential.user.uid, ...newUser });
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithUsername, registerWithUsername, logout, setUser, isAuthReady }}>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={user ? <Navigate to="/generate" replace /> : <LandingPage />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/generate" replace />} />
            
            <Route path="/generate" element={<ProtectedRoute><GeneratePage /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><MyDocumentsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

