import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip,
  Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Users, 
  Plus, 
  LogOut, 
  Moon, 
  Sun, 
  LayoutDashboard, 
  Receipt, 
  Megaphone, 
  Key, 
  User as UserIcon,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  AlertCircle,
  X,
  Wallet,
  Coins,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  PieChart as PieIcon,
  History,
  Settings,
  Bell,
  RefreshCw,
  Coffee,
  MessageSquare,
  Send,
  Trash2
} from 'lucide-react';
import { 
  db, 
  auth,
  forceReconnect
} from './lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  getDocs,
  serverTimestamp, 
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';

// --- Types & Constants ---
type Role = 'chef' | 'user';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'pending';
  groupId: string;
  createdAt: any;
}

interface Group {
  id: string;
  name: string;
  chefId: string;
  budget: number;
  targetAmount: number;
  currentBalance?: number;
  lastBalanceUpdateBy?: string;
  lastBalanceUpdateAt?: any;
  createdAt: any;
}

interface Expense {
  id: string;
  groupId: string;
  participantId: string;
  participantName: string;
  amount: number;
  date: any;
  description: string;
  category: string;
}

interface AccessCode {
  code: string;
  groupId: string;
  used: boolean;
  usedBy?: string;
  createdAt: any;
}

interface JoinRequest {
  id: string;
  userName: string;
  email: string;
  groupName: string;
  groupId: string;
  requesterUid: string;
  status: 'pending' | 'approved';
  usedBy?: string;
  createdAt: any;
}

interface Announcement {
  id: string;
  groupId: string;
  title: string;
  message: string;
  importance: 'normal' | 'high';
  date: any;
}

interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// --- Utils ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const slugify = (text: string) => {
  return text
    .toString()
    .normalize('NFD')                   // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '')   // remove all the accents, which happen to be all in the \u03xx range 
    .trim()                            // trim leading or trailing whitespace
    .toLowerCase()                     // convert to lowercase
    .replace(/[^a-z0-9 -]/g, '')       // remove non-alphanumeric characters
    .replace(/\s+/g, '-')              // replace spaces with hyphens
    .replace(/-+/g, '-');              // remove consecutive hyphens
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isOffline = error instanceof Error && (
    error.message.includes('offline') || 
    error.message.includes('unavailable') ||
    error.message.includes('network')
  );

  if (isOffline) {
    console.warn("Firestore appears offline. Attempting forced reconnection...");
    forceReconnect();
  }

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show a user-friendly alert for connectivity issues instead of just throwing
  if (isOffline && typeof window !== 'undefined') {
    // Optionally we could set a global error state here if App had access to it
  }

  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  title
}: { 
  children: React.ReactNode, 
  onClick?: (e: any) => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  className?: string,
  type?: 'button' | 'submit',
  disabled?: boolean,
  loading?: boolean,
  icon?: any,
  title?: string
}) => {
  const variants = {
    primary: 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90',
    secondary: 'bg-brand-secondary text-white shadow-xl shadow-brand-secondary/20 hover:bg-brand-secondary/90',
    outline: 'border-2 border-slate-200 dark:border-slate-800 hover:bg-brand-surface dark:hover:bg-slate-800 text-brand-on-background',
    ghost: 'hover:bg-brand-surface dark:hover:bg-slate-800 text-brand-on-background',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-500/20',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={cn(
        "px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50",
        variants[variant],
        className
      )}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5" />}
          {children}
        </>
      )}
    </motion.button>
  );
};

const Input = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text', 
  icon: Icon,
  className
}: { 
  label?: string, 
  placeholder: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  type?: string,
  icon?: any,
  className?: string
}) => (
  <div className={cn("space-y-2 w-full", className)}>
    {label && <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-4 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5",
          Icon ? "pl-12" : "pl-4"
        )}
      />
    </div>
  </div>
);

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div 
    className={cn("glass-card p-6 rounded-[var(--radius-card)] premium-shadow overflow-hidden relative", className)}
    {...props}
  >
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-white/20"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black tracking-tight">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const IconButton = ({ icon: Icon, onClick, active, label }: { icon: any, onClick: () => void, active?: boolean, label?: string }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    type="button"
    className={cn(
      "flex flex-col items-center justify-center gap-1 transition-all duration-500 p-3 rounded-2xl relative min-w-[64px] z-10",
      active ? "text-brand-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
    )}
  >
    {active && (
      <motion.div 
        layoutId="nav-pill"
        className="absolute bottom-0 w-8 h-1 bg-brand-primary rounded-full" 
      />
    )}
    <Icon className={cn("w-6 h-6 transition-transform duration-300", active && "scale-110")} />
    {label && <span className={cn("text-[9px] font-black uppercase tracking-widest mt-1", active ? "opacity-100" : "opacity-60")}>{label}</span>}
  </button>
);

function handleAuthError(err: any): string {
  console.error("Auth Error:", err.code, err.message);
  
  switch (err.code) {
    case 'auth/network-request-failed':
      return 'Problème de connexion réseau. Veuillez vérifier votre connexion internet et réessayer.';
    case 'auth/email-already-in-use':
      return 'Cet email est déjà associé à un compte. Veuillez vous connecter.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
    case 'auth/invalid-email':
      return 'Format d\'email invalide.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible (6 caractères minimum).';
    case 'auth/too-many-requests':
      return 'Trop de tentatives échouées. Veuillez patienter quelques minutes avant de réessayer.';
    case 'auth/operation-not-allowed':
      return 'Cette méthode d\'authentification n\'est pas activée. Contactez le support.';
    default:
      return err.message || 'Une erreur d\'authentification est survenue.';
  }
}

// --- Main App ---

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'welcome' | 'auth_chef' | 'auth_user' | 'pending_approval' | 'dashboard'>('welcome');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'expenses' | 'members' | 'news' | 'codes' | 'discussion'>('home');

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const isUserSimplified = profile?.role === 'user' || isPreviewMode;

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authStep, setAuthStep] = useState<'search' | 'waiting'>('search');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join process states
  const [groupName, setGroupName] = useState('');
  const [currentRequest, setCurrentRequest] = useState<JoinRequest | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Recovery effect for anonymous users with pending/approved requests
  useEffect(() => {
    if (user && user.isAnonymous) {
      const q = query(
        collection(db, 'joinRequests'), 
        where('requesterUid', '==', user.uid), 
        orderBy('createdAt', 'desc'), 
        limit(1)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const reqData = { id: snap.docs[0].id, ...snap.docs[0].data() } as JoinRequest;
          setCurrentRequest(reqData);
          if (view === 'welcome' && reqData.status === 'pending') {
            setView('auth_user');
            setAuthStep('waiting');
          }
        }
      });
      return unsub;
    }
  }, [user, view]);

  // Modal form states
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [messageText, setMessageText] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  // Theme effect
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Handle active tab for simplified view
  useEffect(() => {
    if (isUserSimplified && (activeTab === 'home' || activeTab === 'expenses' || activeTab === 'members' || activeTab === 'codes')) {
      setActiveTab('news');
    }
  }, [isUserSimplified, activeTab]);

  // Auth listener: The core Navigation Controller
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (!u) {
        setProfile(null);
        setGroup(null);
        setCurrentRequest(null);
        setIsRedirecting(false);
        setActionLoading(false);
        // Only redirect to welcome if we're not already on an auth screen
        if (view !== 'auth_chef' && view !== 'auth_user') {
          setView('welcome');
        }
        setLoading(false);
        return;
      }

      // If user exists, fetch Firestore profile
      try {
        const profDoc = await getDoc(doc(db, 'users', u.uid));
        
        if (profDoc.exists()) {
          const profData = profDoc.data() as UserProfile;
          setProfile(profData);
          setCurrentRequest(null);

          // Logic based on role and status
          if (profData.status === 'active') {
            if (profData.groupId) {
              const grpDoc = await getDoc(doc(db, 'groups', profData.groupId));
              if (grpDoc.exists()) {
                setGroup({ id: grpDoc.id, ...grpDoc.data() } as Group);
              }
            }
            
            // Smoother transition to dashboard
            if (view !== 'dashboard') {
              setIsRedirecting(true);
              setTimeout(() => {
                setView('dashboard');
                setIsRedirecting(false);
                setLoading(false);
              }, 800);
            } else {
              setLoading(false);
            }
          } else if (profData.status === 'pending') {
            setView('pending_approval');
            setLoading(false);
          } else {
            setLoading(false);
          }
        } else {
          // No profile yet - User might be in the middle of registration
          if (view !== 'auth_user' && view !== 'auth_chef' && view !== 'pending_approval') {
            setView('auth_user');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth profile fetch error:", err);
        setLoading(false);
      }
    });
    return unsub;
  }, [view]);

  // Data listeners
  useEffect(() => {
    if (profile?.groupId) {
      const unsubGrp = onSnapshot(doc(db, 'groups', profile.groupId),
        (snap) => {
          if (snap.exists()) {
            setGroup({ id: snap.id, ...snap.data() } as Group);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `groups/${profile.groupId}`)
      );

      const qExp = query(collection(db, `groups/${profile.groupId}/expenses`), orderBy('date', 'desc'));
      const unsubExp = onSnapshot(qExp, 
        (snap) => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))),
        (err) => handleFirestoreError(err, OperationType.LIST, `groups/${profile.groupId}/expenses`)
      );

      const qAnn = query(collection(db, `groups/${profile.groupId}/announcements`), orderBy('date', 'desc'));
      const unsubAnn = onSnapshot(qAnn, 
        (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))),
        (err) => handleFirestoreError(err, OperationType.LIST, `groups/${profile.groupId}/announcements`)
      );

      const qMem = query(collection(db, 'users'), where('groupId', '==', profile.groupId));
      const unsubMem = onSnapshot(qMem, 
        (snap) => setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );

      const qMsg = query(collection(db, `groups/${profile.groupId}/messages`), orderBy('createdAt', 'asc'), limit(50));
      const unsubMsg = onSnapshot(qMsg,
        (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message))),
        (err) => handleFirestoreError(err, OperationType.LIST, `groups/${profile.groupId}/messages`)
      );

      let unsubCod = () => {};
      if (profile.role === 'chef' && !isPreviewMode) {
        const qCod = query(collection(db, 'accessCodes'), where('groupId', '==', profile.groupId));
        unsubCod = onSnapshot(qCod, 
          (snap) => setCodes(snap.docs.map(d => d.data() as AccessCode)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'accessCodes')
        );

        const qReq = query(collection(db, 'joinRequests'), where('groupId', '==', profile.groupId), where('status', '==', 'pending'));
        const unsubReq = onSnapshot(qReq,
          (snap) => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'joinRequests')
        );
        return () => { unsubGrp(); unsubExp(); unsubAnn(); unsubMem(); unsubMsg(); unsubCod(); unsubReq(); };
      }

      return () => { unsubGrp(); unsubExp(); unsubAnn(); unsubMem(); unsubMsg(); unsubCod(); };
    }
  }, [profile?.groupId, profile?.role]);

  // --- Actions ---

  const handleChefAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    try {
      // 1. Validation basic inputs
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        throw new Error('Veuillez entrer une adresse email valide.');
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
      }

      if (authMode === 'register') {
        if (!name || !groupName) {
          throw new Error('Nom et Nom du groupe requis.');
        }

        const groupSlug = slugify(groupName);
        if (!groupSlug) throw new Error('Nom de groupe invalide.');

        // Check if group exists before touching Auth
        const lookupDoc = await getDoc(doc(db, 'groupLookup', groupSlug));
        if (lookupDoc.exists()) {
          throw new Error('Ce nom de groupe est déjà utilisé. Veuillez en choisir un autre.');
        }

        // 2. Auth creation
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const groupId = `group_${res.user.uid}`;
        
        // 3. Firestore Logic (User Profile)
        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          name,
          email: cleanEmail,
          role: 'chef',
          status: 'active',
          groupId,
          createdAt: serverTimestamp()
        });
        
        // 4. Firestore Logic (Group)
        await setDoc(doc(db, 'groups', groupId), {
          id: groupId,
          name: groupName,
          chefId: res.user.uid,
          budget: 2000,
          createdAt: serverTimestamp()
        });

        await setDoc(doc(db, 'groupLookup', groupSlug), {
          slug: groupSlug,
          name: groupName,
          groupId: groupId
        });
      } else {
        // Login path
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      }
    } catch (err: any) {
      const message = handleAuthError(err);
      setError(message);
      if (err.message?.includes('permissions') || err.code?.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'chefAuth');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Vous devez être connecté pour envoyer une demande.');
      
      const cleanEmail = user.email || '';
      if (!name || !groupName) throw new Error('Veuillez remplir votre nom et le nom du groupe.');
      
      const groupSlug = slugify(groupName);
      const lookupDoc = await getDoc(doc(db, 'groupLookup', groupSlug));
      
      if (!lookupDoc.exists()) {
        throw new Error('Le groupe spécifié n\'existe pas (vérifiez l\'orthographe).');
      }

      const lookupData = lookupDoc.data();
      const groupId = lookupData.groupId;
      
      // Update local profile first as 'pending'
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name,
        email: cleanEmail,
        role: 'user',
        status: 'pending',
        groupId: groupId,
        createdAt: serverTimestamp()
      });

      // Create formal request for Chef to see
      await addDoc(collection(db, 'joinRequests'), {
        requesterUid: user.uid,
        userName: name,
        email: cleanEmail,
        groupName: groupName,
        groupId: groupId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Navigation Controller will handle the transition to 'pending_approval' screen
    } catch (err: any) {
      const message = handleAuthError(err);
      setError(message);
      if (err.message?.includes('permissions') || err.code?.includes('permission')) {
         handleFirestoreError(err, OperationType.CREATE, 'joinRequests');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // User Login for non-chefs
  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      setError(handleAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };


  const handleResetSession = async () => {
    try {
      await signOut(auth);
      setGroupName('');
      setEmail('');
      setPassword('');
      setName('');
      setCurrentRequest(null);
      setAuthStep('search');
      setView('welcome');
      setError(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const generateCode = async () => {
    if (!group) return;
    const code = `QE-${Math.floor(1000 + Math.random() * 8999)}`;
    try {
      await setDoc(doc(db, 'accessCodes', code), {
        code,
        groupId: group.id,
        used: false,
        createdAt: serverTimestamp()
      });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'accessCodes'); }
  };

  const addExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPreviewMode) return;
    if (!group || !profile || !expenseAmount || !expenseDesc) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, `groups/${group.id}/expenses`), {
        groupId: group.id,
        participantId: profile.uid,
        participantName: profile.name,
        amount: parseFloat(expenseAmount),
        description: expenseDesc,
        category: 'general',
        date: serverTimestamp()
      });
      setExpenseAmount('');
      setExpenseDesc('');
      setShowExpenseModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/expenses`); }
    finally { setActionLoading(false); }
  };

  const addAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPreviewMode) return;
    if (!group || !annTitle || !annMsg) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, `groups/${group.id}/announcements`), {
        groupId: group.id,
        title: annTitle,
        message: annMsg,
        importance: 'normal',
        date: serverTimestamp()
      });
      setAnnTitle('');
      setAnnMsg('');
      setShowAnnouncementModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/announcements`); }
    finally { setActionLoading(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !profile || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');
    try {
      await addDoc(collection(db, `groups/${group.id}/messages`), {
        groupId: group.id,
        senderId: profile.uid,
        senderName: profile.name,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/messages`); }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setProfile(null);
      setGroup(null);
      setCurrentRequest(null);
      setIsPreviewMode(false);
      setView('welcome');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (req: JoinRequest) => {
    if (isPreviewMode) return;
    setActionLoading(true);
    try {
      // 1. Update request status
      await updateDoc(doc(db, 'joinRequests', req.id), {
        status: 'approved'
      });

      // 2. Update actual User profile to 'active'
      await updateDoc(doc(db, 'users', req.requesterUid), {
        status: 'active'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'joinRequests');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (req: JoinRequest) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'joinRequests', req.id), {
        status: 'rejected'
      });
      // Optionally notify user via profile
      await updateDoc(doc(db, 'users', req.requesterUid), {
        status: 'pending' // Or rejected
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'joinRequests');
    } finally {
      setActionLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const data: { name: string, value: number, color: string }[] = [];
    members.forEach((m, idx) => {
      const spending = expenses.filter(e => e.participantId === m.uid).reduce((s, e) => s + e.amount, 0);
      if (spending > 0) {
        data.push({ 
          name: m.name, 
          value: spending, 
          color: idx === 0 ? '#e11d48' : idx === 1 ? '#2563eb' : idx === 2 ? '#10b981' : '#f59e0b' 
        });
      }
    });
    return data;
  }, [expenses, members]);

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = group?.budget || 0;
    const target = group?.targetAmount || 0;
    const currentBalance = group?.currentBalance || 0;
    const remainingToTarget = target > 0 ? Math.max(0, target - total) : 0;
    const progress = target > 0 ? Math.min(100, (total / target) * 100) : (total > 0 ? 100 : 0);
    const cashRemaining = currentBalance - total;
    const cashPerc = currentBalance > 0 ? Math.min(100, (total / currentBalance) * 100) : 0;
    
    // Analysis text
    let analysis = "Aucun montant final défini.";
    if (target > 0) {
      if (total === 0) analysis = "Prêt à commencer ! Définissez vos premières dépenses.";
      else if (total < target) analysis = `Vous avez atteint ${progress.toFixed(0)}% de votre objectif final.`;
      else analysis = "Objectif final atteint ou dépassé !";
    }

    return {
      total,
      remaining: budget - total,
      perc: Math.min(100, (total / (budget || 1)) * 100).toFixed(1),
      target,
      remainingToTarget,
      progress: progress.toFixed(1),
      analysis,
      currentBalance,
      cashRemaining,
      cashPerc: cashPerc.toFixed(1)
    };
  }, [expenses, group]);

  const generatePDF = () => {
    if (!group || !profile) return;
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(225, 29, 72); // brand-primary
      doc.text("Rapport QuotaEasy", 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(`Groupe : ${group.name}`, 20, 35);
      doc.text(`Chef : ${profile.name}`, 20, 42);
      doc.text(`Date : ${new Date().toLocaleDateString()}`, 20, 49);
      
      // Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 55, 170, 40, 5, 5, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.text("Résumé Financier", 30, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`Budget Total: $${group.budget.toLocaleString()}`, 30, 75);
      doc.text(`Total Dépenses: $${stats.total.toLocaleString()}`, 30, 82);
      doc.text(`Montant Final Défini: $${stats.target.toLocaleString()}`, 110, 75);
      doc.text(`Reste à Payer (Objectif): $${stats.remainingToTarget.toLocaleString()}`, 110, 82);

      // Expenses Table
      doc.setFont("helvetica", "bold");
      doc.text("Historique des Dépenses", 20, 110);
      
      const tableData = expenses.map(e => [
        formatDate(e.date)?.toLocaleDateString() || '-',
        e.description,
        e.participantName,
        `$${e.amount.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 115,
        head: [['Date', 'Description', 'Membre', 'Montant']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72] },
        styles: { fontSize: 10 }
      });

      // Members List
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont("helvetica", "bold");
      doc.text("Contributions par Membre", 20, finalY);

      const memberSpendingData = members.map(m => [
        m.name,
        m.role === 'chef' ? 'Chef' : 'Membre',
        `$${expenses.filter(e => e.participantId === m.uid).reduce((s, e) => s + e.amount, 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Nom', 'Rôle', 'Total Contribution']],
        body: memberSpendingData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
      });

      // Final Note
      const totalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Généré automatiquement par QuotaEasy. L'avenir de la fintech sociale.", 105, totalY, { align: 'center' });

      doc.save(`Rapport_${group.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Erreur lors de l'export PDF. Veuillez réessayer.");
    }
  };

  const updateTargetAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || isPreviewMode) return;
    const amount = parseFloat(targetAmountInput);
    if (isNaN(amount) || amount < 0) return;
    
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        targetAmount: amount
      });
      setShowTargetModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}`); }
    finally { setActionLoading(false); }
  };

  const updateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !profile || isPreviewMode) return;
    const amount = parseFloat(balanceInput);
    if (isNaN(amount)) return;
    
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        currentBalance: amount,
        lastBalanceUpdateBy: profile.name,
        lastBalanceUpdateAt: serverTimestamp()
      });
      setShowBalanceModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}`); }
    finally { setActionLoading(false); }
  };

  const resetBalance = async () => {
    if (!group || !profile || isPreviewMode) return;
    if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser le solde à zéro ?")) return;
    
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        currentBalance: 0,
        lastBalanceUpdateBy: profile.name,
        lastBalanceUpdateAt: serverTimestamp()
      });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}`); }
    finally { setActionLoading(false); }
  };

  const deleteFinancialData = async () => {
    if (!group || isPreviewMode) return;
    if (!window.confirm("ATTENTION : Cette action supprimera TOUTES les dépenses du groupe. Voulez-vous continuer ?")) return;
    
    setActionLoading(true);
    try {
      // Delete all expenses in the subcollection
      const q = query(collection(db, `groups/${group.id}/expenses`));
      const snap = await getDocs(q);
      const b = writeBatch(db);
      snap.docs.forEach((d) => {
        b.delete(d.ref);
      });
      await b.commit();

      // Reset target amount and balance
      await updateDoc(doc(db, 'groups', group.id), {
        currentBalance: 0,
        targetAmount: 0
      });
      alert("Données financières supprimées avec succès.");
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `groups/${group.id}/expenses`); }
    finally { setActionLoading(false); }
  };

  // --- Animation Variants ---
  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } }
  };
  const fadeInUp = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  };

  // --- Main Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-background">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-3xl brand-gradient flex items-center justify-center shadow-2xl mb-8"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Initialisation du Système...</p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen selection:bg-brand-primary selection:text-white", darkMode ? "dark" : "")}>
      {/* Redirection Overlay */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-white dark:bg-slate-900 border-t-4 border-brand-primary"
          >
            <div className="text-center">
              <motion.div 
                animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-[2rem] brand-gradient flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-primary/30"
              >
                <ShieldCheck className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-black mb-2 tracking-tight">Vérification Réussie</h2>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest leading-none">Accès à votre dashboard sécurisé</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-brand-background">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-[20%] -right-[10%] w-[80%] aspect-square rounded-full bg-brand-primary/5 dark:bg-brand-primary/10 blur-[150px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -70, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-[10%] -left-[10%] w-[70%] aspect-square rounded-full bg-brand-secondary/5 dark:bg-brand-secondary/10 blur-[150px]" 
        />
      </div>

      <AnimatePresence mode="wait">
        {view === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative max-w-5xl mx-auto"
          >
            <div className="absolute top-8 right-8 flex gap-4">
              {user && (
                <Button variant="ghost" onClick={handleLogout} className="p-3 !rounded-full bg-red-500/10 text-red-500 group">
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDarkMode(!darkMode)} className="p-3 !rounded-full bg-white/10 backdrop-blur-md">
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brand-secondary" />}
              </Button>
            </div>

            <motion.div 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-black tracking-widest uppercase mb-6 border border-brand-primary/20">
                <Sparkles className="w-3 h-3" />
                L'avenir de la fintech sociale
              </div>
              <h1 className="text-7xl md:text-8xl font-black font-display tracking-tightest mb-6">
                Quota<span className="text-brand-primary">Easy</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xl max-w-xl mx-auto leading-relaxed">
                Gérez vos dépenses de groupe avec une précision chirurgicale et une interface premium.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {/* Chef Card */}
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => setView('auth_chef')}
                className="group relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-brand-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Card className="relative h-full flex flex-col items-center text-center !p-10 border-brand-primary/10 group-hover:border-brand-primary/30 transition-all duration-500 shadow-xl group-hover:shadow-[0_20px_50px_rgba(225,29,72,0.15)]">
                  <div className="w-24 h-24 rounded-[2.5rem] brand-gradient flex items-center justify-center mb-8 shadow-2xl shadow-brand-primary/30 group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-3xl font-black mb-4 group-hover:text-brand-primary transition-colors">Espace Chef</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                    Créez votre groupe, gérez les membres et supervisez tout le système.
                  </p>
                  <Button variant="primary" onClick={(e) => { e.stopPropagation(); setView('auth_chef'); }} className="w-full py-5 rounded-2xl group-hover:scale-105 transition-transform">
                    Continuer comme Chef
                  </Button>
                </Card>
              </motion.div>

              {/* User Card */}
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => setView('auth_user')}
                className="group relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-brand-secondary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Card className="relative h-full flex flex-col items-center text-center !p-10 border-brand-secondary/10 group-hover:border-brand-secondary/30 transition-all duration-500 shadow-xl group-hover:shadow-[0_20px_50px_rgba(37,99,235,0.15)]">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-brand-secondary flex items-center justify-center mb-8 shadow-2xl shadow-brand-secondary/30 group-hover:scale-110 transition-transform duration-500">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-3xl font-black mb-4 group-hover:text-brand-secondary transition-colors">Mode Utilisateur</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                    Rejoignez un groupe existant et soumettez vos denses à valider.
                  </p>
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setView('auth_user'); }} className="w-full py-5 rounded-2xl group-hover:scale-105 transition-transform">
                    Continuer comme Utilisateur
                  </Button>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}

        {(view === 'auth_chef' || view === 'auth_user') && (
          <motion.div
            key="auth"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-8"
          >
            <div className="w-full flex items-center justify-between mb-8">
              <Button variant="ghost" onClick={() => { setView('welcome'); setAuthStep('search'); setCurrentRequest(null); }} className="p-3 !rounded-full">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {view === 'auth_chef' ? 'Accès Administrateur' : 'Espace Utilisateur'}
              </h2>
              <Button variant="ghost" onClick={() => { handleResetSession(); }} className="p-3 !rounded-full text-red-500 hover:bg-red-500/10">
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
 
            <Card className="w-full !p-8 border-white/10">
              {view === 'auth_chef' ? (
                <>
                  <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-8">
                    {(['login', 'register'] as const).map(m => (
                      <button 
                        key={m}
                        onClick={() => setAuthMode(m)}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          authMode === m ? "bg-white dark:bg-slate-800 shadow-lg text-brand-primary" : "text-slate-400"
                        )}
                      >
                        {m === 'login' ? 'Connexion' : 'Inscription'}
                      </button>
                    ))}
                  </div>
 
                  <form onSubmit={handleChefAuth} className="space-y-5">
                    {authMode === 'register' && (
                      <>
                        <Input 
                          label="Nom Complet" 
                          placeholder="Ex: Patrick Lumumba" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          icon={UserIcon}
                        />
                        <Input 
                          label="Nom du Groupe" 
                          placeholder="Ex: Team Quota" 
                          value={groupName} 
                          onChange={e => setGroupName(e.target.value)} 
                          icon={Users}
                        />
                      </>
                    )}
                    <Input 
                      label="Email" 
                      placeholder="votre@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      icon={Receipt}
                      type="email"
                    />
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Mot de passe" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-12 pl-12 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary p-1"
                      >
                        {showPassword ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </div>
 
                    {error && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-500 text-[13px] font-medium">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                      </motion.div>
                    )}
 
                    <Button variant="primary" type="submit" className="w-full py-5 rounded-[1.5rem] brand-gradient text-white h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20" loading={actionLoading}>
                      {authMode === 'login' ? 'Se Connecter' : 'Créer le Groupe'}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  {!user ? (
                    <>
                      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-8">
                        {(['login', 'register'] as const).map(m => (
                          <button 
                            key={m}
                            onClick={() => setAuthMode(m)}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              authMode === m ? "bg-white dark:bg-slate-800 shadow-lg text-brand-secondary" : "text-slate-400"
                            )}
                          >
                            {m === 'login' ? 'Connexion' : 'Inscription'}
                          </button>
                        ))}
                      </div>
                      <form onSubmit={handleUserAuth} className="space-y-5">
                        <Input 
                          label="Email" 
                          placeholder="votre@email.com" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          icon={Receipt}
                          type="email"
                        />
                        <div className="relative group">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-secondary transition-colors" />
                          <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-12 pl-12 transition-all duration-300 focus:border-brand-secondary outline-none focus:ring-4 focus:ring-brand-secondary/5"
                          />
                        </div>
                        {error && (
                          <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl flex gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                          </div>
                        )}
                        <Button variant="secondary" type="submit" className="w-full py-5 rounded-[1.5rem] bg-brand-secondary text-white h-16 text-lg font-black uppercase tracking-widest" loading={actionLoading}>
                          {authMode === 'login' ? 'Se Connecter' : 'Créer mon Compte'}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <form onSubmit={submitJoinRequest} className="space-y-6">
                      <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-[2rem] bg-brand-secondary/10 flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="w-10 h-10 text-brand-secondary" />
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tightest text-brand-secondary">Demande d'Accès</h3>
                        <p className="text-slate-500 text-sm font-medium">Rejoignez un groupe existant</p>
                      </div>

                      <Input 
                        label="Votre Nom" 
                        placeholder="Ex: Patrick" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        icon={UserIcon}
                      />
                      <Input 
                        label="Nom du Groupe" 
                        placeholder="Ex: Team Quota" 
                        value={groupName} 
                        onChange={e => setGroupName(e.target.value)} 
                        icon={Users}
                      />

                      {error && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-500 text-[13px] font-medium">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p>{error}</p>
                        </motion.div>
                      )}

                      <Button variant="secondary" type="submit" className="w-full py-5 rounded-[1.5rem] bg-brand-secondary text-white h-16 text-lg font-black uppercase tracking-widest" loading={actionLoading}>
                        Envoyer ma Demande
                      </Button>
                    </form>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {view === 'pending_approval' && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg mx-auto px-6 pt-20"
          >
            <Card className="text-center py-12">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 rounded-[2.5rem] bg-brand-secondary/10 flex items-center justify-center mx-auto mb-8"
              >
                <Bell className="w-12 h-12 text-brand-secondary" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4">En Attente...</h3>
              <p className="text-slate-500 font-medium mb-10 px-4">
                Votre demande pour rejoindre le groupe <span className="text-brand-secondary font-black">{profile?.groupId?.replace('group_', '') || 'votre Team'}</span> est en cours de traitement par l'administrateur.
              </p>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mb-10">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Statut Actuel</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-secondary animate-ping" />
                  <span className="font-black text-lg text-brand-secondary uppercase">Analyse du Chef</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  L'application s'ouvrira automatiquement après validation.
                </p>
                <button 
                  onClick={handleLogout}
                  className="text-xs font-black uppercase tracking-[0.3em] text-red-500/60 hover:text-red-500 transition-colors mt-4"
                >
                  Se Déconnecter
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {view === 'dashboard' && profile && group && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            className="w-full max-w-xl mx-auto px-6 pt-10 pb-32"
          >
            {/* Header Area */}
            <div className="flex items-start justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center shadow-xl group">
                  <span className="text-white font-black text-xl">{profile.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-0.5">Ravi de vous revoir</p>
                  <h2 className="text-2xl font-black tracking-tight">{profile.name} {isPreviewMode && <span className="text-xs text-brand-primary">(Aperçu)</span>}</h2>
                </div>
              </div>
              <div className="flex gap-2">
                {profile.role === 'chef' && (
                  <Button 
                    variant={isPreviewMode ? "primary" : "ghost"}
                    onClick={() => {
                      setIsPreviewMode(!isPreviewMode);
                      setActiveTab('home');
                    }}
                    className={cn(
                      "p-3 !rounded-xl border-none",
                      isPreviewMode ? "" : "!bg-slate-100 dark:!bg-slate-900 text-slate-500"
                    )}
                    title={isPreviewMode ? "Quitter l'aperçu" : "Aperçu Utilisateur"}
                  >
                    <UserIcon className="w-5 h-5" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    forceReconnect();
                    window.location.reload();
                  }} 
                  className="p-3 !rounded-xl !bg-slate-100 dark:!bg-slate-900 border-none text-slate-500"
                  title="Forcer la synchronisation"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
                <Button variant="ghost" onClick={() => setDarkMode(!darkMode)} className="p-3 !rounded-xl !bg-slate-100 dark:!bg-slate-900 border-none">
                  {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="p-3 !rounded-xl !bg-red-500/10 border-none text-red-500">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'home' && !isUserSimplified && (
                <motion.div 
                  key="home"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.div variants={fadeInUp}>
                    <Card className="brand-gradient text-white border-none !p-8 shadow-2xl shadow-brand-primary/20 group">
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Solde de la Team (Disponible)</p>
                          <h3 className="text-5xl font-black tracking-tighter">${stats.cashRemaining.toLocaleString()}</h3>
                          <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest">Sur un solde initial de ${stats.currentBalance.toLocaleString()}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
                          <Wallet className="w-7 h-7" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                          <span className="text-white/60">Utilisation du Solde</span>
                          <span>{stats.cashPerc}%</span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.cashPerc}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                          />
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-none">Dépensé: ${stats.total.toLocaleString()}</span>
                          <div className="flex items-center gap-2">
                            {profile.role === 'chef' && !isPreviewMode && (
                              <button 
                                onClick={() => { setBalanceInput(stats.currentBalance.toString()); setShowBalanceModal(true); }}
                                className="text-[10px] font-black text-white bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all uppercase"
                              >
                                Gérer Solde
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {profile.role === 'chef' && !isPreviewMode && (
                    <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="ghost" 
                        onClick={resetBalance}
                        className="!bg-slate-100 dark:!bg-slate-900 border-none !p-4 !rounded-2xl flex flex-col items-center gap-2 h-auto"
                      >
                        <RefreshCw className="w-5 h-5 text-brand-secondary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Réinitialiser</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={deleteFinancialData}
                        className="!bg-red-500/5 dark:!bg-red-500/10 border-none !p-4 !rounded-2xl flex flex-col items-center gap-2 h-auto"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Purger Données</span>
                      </Button>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div variants={fadeInUp}>
                      <Card className="!p-5 border-none bg-slate-100 dark:bg-slate-900 group hover:ring-2 hover:ring-brand-primary/20 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4 text-brand-primary">
                          <Coins className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cible Finale</p>
                        <h4 className="text-2xl font-black">${stats.target.toLocaleString()}</h4>
                        {profile.role === 'chef' && !isPreviewMode && (
                          <button 
                            onClick={() => { setTargetAmountInput(stats.target.toString()); setShowTargetModal(true); }}
                            className="text-[9px] font-black uppercase text-brand-primary hover:underline mt-2"
                          >
                            Modifier
                          </button>
                        )}
                      </Card>
                    </motion.div>

                    <motion.div variants={fadeInUp}>
                      <Card className="!p-5 border-none bg-slate-100 dark:bg-slate-900 group hover:ring-2 hover:ring-brand-secondary/20 transition-all flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reste à payer</p>
                        <h4 className="text-2xl font-black text-brand-secondary">${stats.remainingToTarget.toLocaleString()}</h4>
                        <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.progress}%` }}
                            className="h-full bg-brand-secondary"
                          />
                        </div>
                      </Card>
                    </motion.div>
                  </div>

                  <motion.div variants={fadeInUp}>
                    <Card className="border-none bg-indigo-500/5 dark:bg-indigo-500/10 !p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Analyse Automatique</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.analysis}</p>
                        </div>
                      </div>
                      {profile.role === 'chef' && !isPreviewMode && (
                        <Button 
                          variant="ghost" 
                          onClick={generatePDF} 
                          icon={CreditCard}
                          className="!py-2 !px-4 text-xs !bg-indigo-500/20 text-indigo-500 shadow-none hover:!bg-indigo-500/30"
                        >
                          Exporter PDF
                        </Button>
                      )}
                    </Card>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div variants={fadeInUp}>
                      <Card className="h-full">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                            <PieIcon className="w-5 h-5 text-brand-primary" />
                            Répartition de la Team
                          </h3>
                        </div>
                        <div className="h-[250px] w-full flex items-center justify-center">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="99%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  animationBegin={0}
                                  animationDuration={800}
                                >
                                  {chartData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartData[index].color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    backgroundColor: darkMode ? '#1e293b' : '#fff',
                                    color: darkMode ? '#f8fafc' : '#1e293b'
                                  }} 
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-center opacity-30 select-none">
                              <PieIcon className="w-12 h-12 mx-auto mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">En attente de données</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div variants={fadeInUp}>
                      <Card className="h-full">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                            <Bell className="w-5 h-5 text-brand-primary" />
                            Annonces Groupées
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {announcements.slice(0, 3).map(a => (
                            <div key={a.id} className={cn(
                              "p-4 rounded-2xl flex gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                              a.importance === 'high' ? "bg-red-500/5" : "bg-brand-secondary/5"
                            )}>
                              <div className={cn(
                                "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg",
                                a.importance === 'high' ? "bg-red-500 text-white" : "bg-brand-secondary text-white"
                              )}>
                                {a.importance === 'high' ? <AlertCircle className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-[13px] mb-0.5 truncate">{a.title}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-1">{a.message}</p>
                              </div>
                            </div>
                          ))}
                          {announcements.length === 0 && <p className="text-center text-xs text-slate-400 py-4 font-bold tracking-widest uppercase">Aucune annonce</p>}
                        </div>
                      </Card>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'expenses' && !isUserSimplified && (
                <motion.div 
                  key="expenses"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.div variants={fadeInUp}>
                    <Card className="brand-gradient text-white border-none flex items-center justify-between !p-8">
                      <div>
                        <h3 className="text-2xl font-black mb-1">Journal des Dépenses</h3>
                        <p className="text-white/60 text-xs font-medium">Vérifiez chaque centime au sein de votre équipe.</p>
                      </div>
                      {!isPreviewMode && (
                        <Button variant="ghost" className="!bg-white/20 !text-white !p-4 !rounded-2xl" onClick={(e) => { e.stopPropagation(); setShowExpenseModal(true); }}>
                          <Plus className="w-6 h-6" />
                        </Button>
                      )}
                    </Card>
                  </motion.div>

                  <div className="space-y-4">
                    {expenses.map((e, idx) => (
                      <motion.div key={e.id} variants={fadeInUp}>
                        <Card className="!p-4 hover:border-brand-primary/20 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                              {idx % 3 === 0 ? <Receipt className="w-6 h-6 text-slate-400" /> : idx % 3 === 1 ? <Coffee className="w-6 h-6 text-slate-400" /> : <CreditCard className="w-6 h-6 text-slate-400" />}
                            </div>
                            <div>
                              <p className="font-bold text-[15px]">{e.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black uppercase text-brand-primary">{e.participantName}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[9px] font-bold text-slate-400">{formatDate(e.date)?.toLocaleDateString() || 'Pending'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">-${e.amount.toLocaleString()}</p>
                            {profile.role === 'chef' && !isPreviewMode && (
                              <button onClick={() => deleteDoc(doc(db, `groups/${group!.id}/expenses`, e.id))} className="text-[9px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors">Supprimer</button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'codes' && profile.role === 'chef' && (
                <motion.div 
                  key="codes"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.div variants={fadeInUp}>
                    <Card className="bg-slate-900 text-white border-none flex items-center justify-between shadow-2xl !p-8">
                      <div>
                        <h3 className="text-2xl font-black mb-1">Passports de la Team</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Partagez pour ajouter des membres</p>
                      </div>
                      {!isPreviewMode && (
                        <Button variant="primary" onClick={(e) => { e.stopPropagation(); generateCode(); }} className="!p-4">
                          <Plus className="w-6 h-6" />
                        </Button>
                      )}
                    </Card>
                  </motion.div>

                  <div className="grid gap-4">
                    {codes.map(c => (
                      <motion.div key={c.code} variants={fadeInUp}>
                        <Card className={cn("!p-6 flex items-center justify-between border-2 transition-all", c.used ? "opacity-50 border-transparent bg-slate-100 dark:bg-slate-800" : "border-slate-50 dark:border-slate-900")}>
                          <div className="flex items-center gap-5">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", c.used ? "bg-slate-200 dark:bg-slate-700" : "bg-emerald-500/10")}>
                              <Key className={cn("w-6 h-6", c.used ? "text-slate-400" : "text-emerald-500")} />
                            </div>
                            <div>
                              <p className={cn("text-2xl font-black tracking-[0.2em]", c.used && "line-through text-slate-400")}>{c.code}</p>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.used ? "Désactivé" : "Prêt à l'emploi"}</span>
                            </div>
                          </div>
                          {!c.used && (
                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation();
                                try {
                                  navigator.clipboard.writeText(c.code);
                                } catch (err) {
                                  console.error("Clipboard fail", err);
                                }
                              }}
                              className="w-12 h-12 bg-brand-surface dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-90 z-10"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'news' && (
                <motion.div 
                  key="news"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.div variants={fadeInUp}>
                    <Card className="brand-gradient text-white border-none !p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-black mb-1">Annonces du Chef</h3>
                          <p className="text-white/60 text-xs font-medium">Informations importantes pour toute l'équipe.</p>
                        </div>
                      {!isPreviewMode && profile.role === 'chef' && (
                        <div className="flex gap-2">
                          {requests.length > 0 && (
                            <div className="relative">
                              <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-white dark:border-slate-900 z-10"
                              >
                                {requests.length}
                              </motion.div>
                              <Button 
                                variant="ghost" 
                                className="!bg-white/20 !text-white !p-4 !rounded-2xl" 
                                onClick={(e) => { e.stopPropagation(); setActiveTab('members'); }}
                              >
                                <UserPlus className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            className="!bg-white/20 !text-white !p-4 !rounded-2xl" 
                            onClick={(e) => { e.stopPropagation(); setShowAnnouncementModal(true); }}
                          >
                            <Plus className="w-6 h-6" />
                          </Button>
                        </div>
                      )}
                      </div>
                    </Card>
                  </motion.div>

                  <div className="space-y-4">
                    {announcements.map(a => (
                      <motion.div key={a.id} variants={fadeInUp}>
                        <Card className={cn(
                          "relative overflow-hidden !border-none",
                          a.importance === 'high' ? "bg-red-500/5" : "bg-slate-100 dark:bg-slate-900 shadow-xl"
                        )}>
                          <div className={cn("absolute left-0 top-0 bottom-0 w-2", a.importance === 'high' ? "bg-red-500" : "bg-brand-secondary")} />
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-xl font-black tracking-tight">{a.title}</h4>
                            <span className="text-[10px] font-black uppercase text-slate-400">{formatDate(a.date)?.toLocaleDateString() || 'Récemment'}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{a.message}</p>
                          {profile.role === 'chef' && !isPreviewMode && (
                            <button onClick={() => deleteDoc(doc(db, `groups/${group!.id}/announcements`, a.id))} className="text-[10px] font-black uppercase text-red-500 hover:underline">Révoquer</button>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                    {announcements.length === 0 && (
                      <Card className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 border-dashed border-2 border-slate-200 dark:border-slate-800">
                        <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aucune annonce pour le moment</p>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'discussion' && (
                <motion.div 
                  key="discussion"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col h-[calc(100vh-280px)]"
                >
                  <Card className="flex-1 flex flex-col !p-0 overflow-hidden bg-slate-50 dark:bg-slate-900/50 border-none">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-xl tracking-tight">Espace Discussion</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Échangez avec votre équipe</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">En direct</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                      {messages.map((m) => (
                        <div key={m.id} className={cn(
                          "flex flex-col max-w-[85%]",
                          m.senderId === profile.uid ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <span className="text-[9px] font-black uppercase text-slate-400 mb-1 px-1">
                            {m.senderId === profile.uid ? 'Vous' : m.senderName}
                          </span>
                          <div className={cn(
                            "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm",
                            m.senderId === profile.uid 
                              ? "brand-gradient text-white !rounded-tr-none" 
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 !rounded-tl-none border border-slate-100 dark:border-slate-800"
                          )}>
                            {m.text}
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 mt-1 px-1">
                            {formatDate(m.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                          <MessageSquare className="w-12 h-12 mb-4" />
                          <p className="font-black text-xs uppercase tracking-widest text-center">Aucun message.<br/>Lancez la discussion !</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Écrivez un message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-6 pr-14 outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all text-sm font-medium"
                        />
                        <button 
                          type="submit"
                          disabled={!messageText.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 brand-gradient text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'members' && !isUserSimplified && (
                <motion.div 
                  key="members"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-8"
                >
                  {profile.role === 'chef' && requests.length > 0 && (
                    <motion.div variants={fadeInUp}>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                        Demandes en Attente
                        <span className="bg-brand-primary text-white text-[10px] px-2 py-0.5 rounded-full">{requests.length}</span>
                      </h3>
                      <div className="space-y-4">
                        {requests.map(req => (
                          <Card key={req.id} className="!p-5 border-l-4 border-l-brand-secondary flex items-center justify-between group bg-white dark:bg-slate-900 shadow-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-brand-secondary" />
                              </div>
                              <div>
                                <h4 className="font-black text-lg leading-none mb-1">{req.userName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                  {req.email}<br/>
                                  Souhaite rejoindre
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {req.status === 'approved' ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-black text-green-500 uppercase">Validé</span>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="secondary" 
                                    className="py-2.5 px-4 rounded-xl text-[10px] h-auto" 
                                    onClick={() => handleApproveRequest(req)}
                                    loading={actionLoading}
                                    disabled={isPreviewMode}
                                  >
                                    Approuver
                                  </Button>
                                  <button 
                                    onClick={() => handleRejectRequest(req)}
                                    disabled={actionLoading || isPreviewMode}
                                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <motion.div variants={fadeInUp}>
                    <Card className="!p-8 brand-gradient text-white border-none shadow-2xl shadow-brand-primary/20">
                      <h3 className="text-3xl font-black mb-1">Annuaire de la Team</h3>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest">{members.length} Membres Confirmés</p>
                    </Card>
                  </motion.div>

                  <div className="grid gap-4">
                    {members.map(m => (
                      <motion.div key={m.uid} variants={fadeInUp}>
                        <Card className="!p-5 border-none bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[1.5rem] brand-gradient flex items-center justify-center text-white font-black text-2xl shadow-xl">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-lg">{m.name}</h4>
                                {m.role === 'chef' && <ShieldCheck className="w-4 h-4 text-brand-primary" />}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inscrit le {formatDate(m.createdAt)?.toLocaleDateString() || 'Maintenant'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contribution</p>
                            <p className="text-xl font-black text-brand-primary">
                              ${expenses.filter(e => e.participantId === m.uid).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Navigation */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-lg glass-card !rounded-[2.5rem] !p-2 flex justify-between items-center z-50 !bg-white/80 dark:!bg-slate-900/80 !border-white/50 dark:!border-white/5 active-nav shadow-2xl">
              {!isUserSimplified && <IconButton icon={LayoutDashboard} label="Tableau" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />}
              {!isUserSimplified && <IconButton icon={Receipt} label="Journal" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />}
              
              <IconButton icon={Megaphone} label="Actu" active={activeTab === 'news'} onClick={() => setActiveTab('news')} />
              <IconButton icon={MessageSquare} label="Discussion" active={activeTab === 'discussion'} onClick={() => setActiveTab('discussion')} />
              
              {!isUserSimplified && (
                <div className="relative">
                  <IconButton icon={Users} label="Team" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                  {profile.role === 'chef' && requests.length > 0 && !isPreviewMode && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              )}
            </nav>

            {/* FAB */}
            {profile.role === 'chef' && !isPreviewMode && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (activeTab === 'news') {
                    setShowAnnouncementModal(true);
                  } else {
                    setShowExpenseModal(true);
                  }
                }}
                className="fixed bottom-32 right-8 w-16 h-16 rounded-3xl brand-gradient text-white shadow-2xl shadow-brand-primary/40 flex items-center justify-center z-50 premium-shadow"
              >
                <Plus className="w-8 h-8" />
              </motion.button>
            )}

            {/* Modals */}
            <Modal
              isOpen={showExpenseModal}
              onClose={() => setShowExpenseModal(false)}
              title="Ajouter une Dépense"
            >
              <form onSubmit={addExpense} className="space-y-6">
                <Input 
                  label="Montant ($)" 
                  placeholder="0.00" 
                  value={expenseAmount} 
                  onChange={e => setExpenseAmount(e.target.value)} 
                  icon={Coins}
                  type="number"
                />
                <Input 
                  label="Description" 
                  placeholder="C'était pour quoi ?" 
                  value={expenseDesc} 
                  onChange={e => setExpenseDesc(e.target.value)} 
                  icon={Receipt}
                />
                <Button variant="primary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Confirmer le Paiement
                </Button>
              </form>
            </Modal>

            <Modal
              isOpen={showAnnouncementModal}
              onClose={() => setShowAnnouncementModal(false)}
              title="Diffuser une Annonce"
            >
              <form onSubmit={addAnnouncement} className="space-y-6">
                <Input 
                  label="Titre de l'Annonce" 
                  placeholder="Attention la Team..." 
                  value={annTitle} 
                  onChange={e => setAnnTitle(e.target.value)} 
                  icon={Megaphone}
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Message</label>
                  <textarea
                    placeholder="Écrivez à tout le monde..."
                    value={annMsg}
                    onChange={e => setAnnMsg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5 min-h-[120px]"
                  />
                </div>
                <Button variant="secondary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Envoyer l'Annonce
                </Button>
              </form>
            </Modal>

            <Modal
              isOpen={showTargetModal}
              onClose={() => setShowTargetModal(false)}
              title="Montant Final du Groupe"
            >
              <form onSubmit={updateTargetAmount} className="space-y-6">
                <Input 
                  label="Montant Cible ($)" 
                  placeholder="Ex: 5000" 
                  value={targetAmountInput} 
                  onChange={e => setTargetAmountInput(e.target.value)} 
                  icon={Sparkles}
                  type="number"
                />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                  Ce montant définit l'objectif global de la team. L'analyse automatique se basera sur ce chiffre pour calculer le reste à payer.
                </p>
                <Button variant="primary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Enregistrer l'Objectif
                </Button>
              </form>
            </Modal>

            <Modal
              isOpen={showBalanceModal}
              onClose={() => setShowBalanceModal(false)}
              title="Gérer le Solde"
            >
              <form onSubmit={updateBalance} className="space-y-6">
                <Input 
                  label="Solde de la Team ($)" 
                  placeholder="Ex: 1000" 
                  value={balanceInput} 
                  onChange={e => setBalanceInput(e.target.value)} 
                  icon={Wallet}
                  type="number"
                />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                  Modifier le montant total d'argent dont dispose votre équipe. Ce chiffre servira de base pour le calcul du solde disponible.
                </p>
                <Button variant="primary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Mettre à jour le Solde
                </Button>
              </form>
            </Modal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
