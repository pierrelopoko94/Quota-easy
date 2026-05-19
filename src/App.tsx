import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  auth
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
  allocatedAmount?: number;
  createdAt: any;
}

interface Group {
  id: string; // Internal firestore ID
  groupId: string; // Explicit field requested
  name: string;
  groupName: string; // Explicit field requested
  chefId: string;
  ownerId: string; // Explicit field requested
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
  chefId: string;
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
  chefId: string;
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
  chefId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface Contribution {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved';
  date: any;
  lastUpdated?: any;
  description?: string;
  isAdjustment?: boolean;
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
    console.warn("Firestore appears offline. Please check your connection.");
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
  
  if (isOffline && typeof window !== 'undefined') {
    // Alert the user about connection issues
  }
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
          "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-4 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-600",
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
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-white/20 dark:border-white/5"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black tracking-tight dark:text-white">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="dark:text-slate-200">
            {children}
          </div>
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
  
  const code = err.code || '';
  const message = err.message || '';

  // Generic catch for common credential errors in v10+
  if (message.includes('invalid-credential') || code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return "Email ou mot de passe incorrect. Si vous n'avez pas de compte, veuillez vous inscrire.";
  }

  switch (code) {
    case 'auth/network-request-failed':
      return 'Erreur réseau : Connexion impossible aux serveurs. Vérifiez votre internet.';
    case 'auth/email-already-in-use':
      return 'Ce compte existe déjà. Veuillez vous connecter.';
    case 'auth/invalid-email':
      return 'L\'adresse email n\'est pas valide (ex: nom@domaine.com).';
    case 'auth/weak-password':
      return 'Le mot de passe est trop court (6 caractères minimum).';
    case 'auth/too-many-requests':
      return 'Sécurité : Trop de tentatives infructueuses. Réessayez dans quelques minutes.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé par un administrateur.';
    case 'auth/operation-not-allowed':
      return "L'authentification Email/Mot de passe n'est pas activée dans la console Firebase.";
    default:
      if (message.toLowerCase().includes('network')) return 'Erreur réseau : Connexion impossible.';
      return 'Une erreur d\'authentification est survenue. Veuillez réessayer.';
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
  const [showUserAmountModal, setShowUserAmountModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userAmountInput, setUserAmountInput] = useState('');
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
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'discussion') {
      scrollToBottom();
    }
  }, [messages, activeTab]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [showMemberContribsModal, setShowMemberContribsModal] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [editContribAmount, setEditContribAmount] = useState('');

  // Theme effect
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Handle active tab for simplified view
  useEffect(() => {
    if (isUserSimplified && (activeTab === 'expenses' || activeTab === 'members' || activeTab === 'codes')) {
      setActiveTab('news');
    }
  }, [isUserSimplified, activeTab]);

  // Auth listener: Just handles the Firebase User object
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setError(null);
      if (!u) {
        setProfile(null);
        setGroup(null);
        setCurrentRequest(null);
        setIsRedirecting(false);
        setActionLoading(false);
        if (view !== 'auth_chef' && view !== 'auth_user') {
          setView('welcome');
        }
        setLoading(false);
      }
    });
    return unsub;
  }, [view]);

  // Profile listener: Syncs the UserProfile in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      if (snap.exists()) {
        const profData = snap.data() as UserProfile;
        setProfile(profData);
        setCurrentRequest(null);

        if (profData.status === 'active') {
          if (profData.groupId) {
            // Use local state to avoid multiple lookups if already set
            getDoc(doc(db, 'groups', profData.groupId)).then((grpDoc) => {
              if (grpDoc.exists()) {
                setGroup({ id: grpDoc.id, ...grpDoc.data() } as Group);
                
                if (view !== 'dashboard' && !isRedirecting) {
                  setIsRedirecting(true);
                  setTimeout(() => {
                    setView('dashboard');
                    setIsRedirecting(false);
                    setLoading(false);
                  }, 600);
                } else {
                  setLoading(false);
                }
              } else {
                console.warn("Group not found, redirecting...");
                setLoading(false);
              }
            });
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
        if (view !== 'auth_user' && view !== 'auth_chef' && view !== 'pending_approval' && view !== 'welcome') {
          setView('auth_user');
        }
        setLoading(false);
      }
    }, (err) => {
      console.error("Profile sync error:", err);
      setLoading(false);
    });

    return unsub;
  }, [user?.uid, view, isRedirecting]);

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

      const qExp = query(collection(db, 'expenses'), where('groupId', '==', profile.groupId));
      const unsubExp = onSnapshot(qExp, 
        (snap) => {
          const docs = snap.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, amount: Number(data.amount) || 0 } as Expense;
          });
          // In-memory sort to be resilient to missing date fields
          docs.sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dbVal = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dbVal - da;
          });
          setExpenses(docs);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'expenses')
      );

      const qCont = query(collection(db, 'contributions'), where('groupId', '==', profile.groupId));
      const unsubCont = onSnapshot(qCont,
        (snap) => {
          const docs = snap.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, amount: Number(data.amount) || 0 } as Contribution;
          });
          docs.sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dbVal = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dbVal - da;
          });
          setContributions(docs);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'contributions')
      );

      const qAnn = query(collection(db, 'annonces'), where('groupId', '==', profile.groupId), orderBy('date', 'desc'));
      const unsubAnn = onSnapshot(qAnn, 
        (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'annonces')
      );

      const qMem = query(collection(db, 'users'), where('groupId', '==', profile.groupId));
      const unsubMem = onSnapshot(qMem, 
        (snap) => setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );

      const qMsg = query(collection(db, 'comments'), where('groupId', '==', profile.groupId), orderBy('createdAt', 'asc'), limit(50));
      const unsubMsg = onSnapshot(qMsg,
        (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'comments')
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
        return () => { unsubGrp(); unsubExp(); unsubCont(); unsubAnn(); unsubMem(); unsubMsg(); unsubCod(); unsubReq(); };
      }

      return () => { unsubGrp(); unsubExp(); unsubCont(); unsubAnn(); unsubMem(); unsubMsg(); unsubCod(); };
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        throw new Error('Veuillez entrer une adresse email valide.');
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
      }

      if (authMode === 'register') {
        if (!name || !groupName) {
          throw new Error('Votre nom et le nom du groupe sont requis.');
        }

        const groupSlug = slugify(groupName);
        if (!groupSlug) throw new Error('Nom de groupe invalide.');

        // Check if group exists before touching Auth
        const lookupDoc = await getDoc(doc(db, 'groupLookup', groupSlug));
        if (lookupDoc.exists()) {
          throw new Error(`Le nom "${groupName}" est déjà utilisé. Essayez par exemple "${groupName} ${Math.floor(Math.random() * 99)}" ou connectez-vous si vous en êtes le propriétaire.`);
        }

        try {
          // Attempt to create user
          const res = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          
          // Generate a clean group ID using firestore's auto-generation
          const groupRef = doc(collection(db, 'groups'));
          const groupId = groupRef.id;
          
          // Firestore Logic (User Profile)
          await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            name,
            email: cleanEmail,
            role: 'chef',
            status: 'active',
            groupId,
            createdAt: serverTimestamp()
          });
          
          // Firestore Logic (Group)
          await setDoc(groupRef, {
            id: groupId,
            groupId: groupId,
            name: groupName,
            groupName: groupName,
            chefId: res.user.uid,
            ownerId: res.user.uid,
            budget: 2000,
            targetAmount: 0,
            createdAt: serverTimestamp()
          });

          await setDoc(doc(db, 'groupLookup', groupSlug), {
            slug: groupSlug,
            name: groupName,
            groupId: groupId,
            chefId: res.user.uid
          });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setAuthMode('login'); // Automatically switch to login
            throw new Error('Ce compte existe déjà. Nous vous avons redirigé vers la page de connexion.');
          }
          throw authErr;
        }
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
      const chefIdForRequest = lookupData.chefId;

      // Verification of code if provided
      if (groupCode) {
        const codeSnap = await getDoc(doc(db, 'accessCodes', groupCode));
        if (!codeSnap.exists()) {
          throw new Error('Code du Chef invalide.');
        }
        const codeData = codeSnap.data();
        if (codeData.groupId !== groupId) {
          throw new Error('Ce code ne correspond pas à ce groupe.');
        }
        if (codeData.used) {
          throw new Error('Ce code a déjà été utilisé.');
        }

        // Mark code as used
        await updateDoc(doc(db, 'accessCodes', groupCode), {
          used: true,
          usedBy: user.uid
        });
      }
      
      const isAutoApprove = groupCode ? true : false;
      
      // Update local profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name,
        email: cleanEmail,
        role: 'user',
        status: isAutoApprove ? 'active' : 'pending',
        groupId: groupId,
        createdAt: serverTimestamp()
      });

      // Create formal request
      await addDoc(collection(db, 'joinRequests'), {
        requesterUid: user.uid,
        userName: name,
        email: cleanEmail,
        groupName: groupName,
        groupId: groupId,
        chefId: chefIdForRequest,
        status: isAutoApprove ? 'approved' : 'pending',
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message || handleAuthError(err));
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
      const cleanPassword = password;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        throw new Error('Veuillez entrer une adresse email valide.');
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
      }

      if (authMode === 'register') {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setAuthMode('login');
            throw new Error('Ce compte existe déjà. Nous vous avons redirigé vers la page de connexion.');
          }
          throw authErr;
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
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
        chefId: group.chefId,
        groupName: group.name,
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
      await addDoc(collection(db, 'expenses'), {
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
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'expenses'); }
    finally { setActionLoading(false); }
  };

  const addAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPreviewMode) return;
    if (!group || !annTitle || !annMsg) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'annonces'), {
        groupId: group.id,
        title: annTitle,
        message: annMsg,
        importance: 'normal',
        date: serverTimestamp()
      });
      setAnnTitle('');
      setAnnMsg('');
      setShowAnnouncementModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'annonces'); }
    finally { setActionLoading(false); }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!group) return;
    try {
      await deleteDoc(doc(db, 'annonces', announcementId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `annonces/${announcementId}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !profile || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');
    try {
      await addDoc(collection(db, 'comments'), {
        groupId: group.id,
        chefId: group.chefId,
        senderId: profile.uid,
        senderName: profile.name,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'comments'); }
  };

  const deleteMessage = async (messageId: string) => {
    if (!group) return;
    try {
      await deleteDoc(doc(db, 'comments', messageId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `comments/${messageId}`);
    }
  };

  const updateMessage = async (messageId: string) => {
    if (!group || !editingText.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', messageId), {
        text: editingText.trim()
      });
      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${messageId}`);
    }
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
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const approvedContribs = (contributions || []).filter(c => c.status === 'approved');
    const totalContributed = approvedContribs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalPending = (contributions || [])
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    
    // Formula: Team Balance = Approved Contributions - Total Expenses
    const cashRemaining = totalContributed - totalExpenses;
    
    const target = group?.targetAmount || 0;
    const remainingToTarget = target > 0 ? Math.max(0, target - totalContributed) : 0;
    
    const progressBarVal = target > 0 ? Math.min(100, (totalExpenses / target) * 100) : (totalExpenses > 0 ? 100 : 0);
    
    const cashPerc = totalContributed > 0 ? Math.min(100, (totalExpenses / totalContributed) * 100) : 0;
    
    // Member specific contribs
    const memberContribs = (members || []).map(m => {
      const all = (contributions || [])
        .filter(c => c.userId === m.uid)
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const approved = (contributions || [])
        .filter(c => c.userId === m.uid && c.status === 'approved')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const pending = (contributions || [])
        .filter(c => c.userId === m.uid && c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      return { uid: m.uid, name: m.name, total: all, approved, pending };
    });

    let analysis = "Prêt à commencer !";
    if (target > 0) {
      if (totalExpenses < target) analysis = `Objectif final : ${progressBarVal.toFixed(0)}% atteint.`;
      else analysis = "Objectif final atteint !";
    }

    return {
      totalExpenses,
      totalContributed,
      cashRemaining,
      cashPerc: cashPerc.toFixed(1),
      target,
      remainingToTarget,
      progress: progressBarVal.toFixed(1),
      analysis,
      memberContribs
    };
  }, [expenses, contributions, group, members]);

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
      doc.text(`Total Donné: $${stats.totalContributed.toLocaleString()}`, 30, 75);
      doc.text(`Total Dépenses: $${stats.totalExpenses.toLocaleString()}`, 30, 82);
      doc.text(`Montant Final Défini: $${stats.target.toLocaleString()}`, 110, 75);
      doc.text(`Solde Restant: $${stats.cashRemaining.toLocaleString()}`, 110, 82);

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

    const memberFinancialData = stats.memberContribs.map(m => [
        m.name,
        `$${m.total.toLocaleString()}`,
        `$${expenses.filter(e => e.participantId === m.uid).reduce((s, e) => s + e.amount, 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Nom', 'Total Contributions', 'Dépenses Signalées']],
        body: memberFinancialData,
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
    
    setActionLoading(true);
    try {
      // Delete all expenses
      const qExp = query(collection(db, 'expenses'), where('groupId', '==', group.id));
      const snapExp = await getDocs(qExp);
      const b = writeBatch(db);
      snapExp.docs.forEach((d) => b.delete(d.ref));
      
      // Delete all contributions
      const qCont = query(collection(db, 'contributions'), where('groupId', '==', group.id));
      const snapCont = await getDocs(qCont);
      snapCont.docs.forEach((d) => b.delete(d.ref));

      await b.commit();

      // Reset group fields
      await updateDoc(doc(db, 'groups', group.id), {
        currentBalance: 0,
        targetAmount: 0
      });
      alert("Données financières réinitialisées.");
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, 'financials'); }
    finally { setActionLoading(false); }
  };

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !profile || !contribAmount) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'contributions'), {
        groupId: group.id,
        userId: profile.uid,
        userName: profile.name,
        amount: parseFloat(contribAmount),
        status: 'pending',
        date: serverTimestamp()
      });
      setContribAmount('');
      setShowContributionModal(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'contributions'); }
    finally { setActionLoading(false); }
  };

  const approveContribution = async (contribId: string) => {
    if (!group || isPreviewMode) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'contributions', contribId), {
        status: 'approved'
      });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `contributions/${contribId}`); }
    finally { setActionLoading(false); }
  };

  const deleteContribution = async (contribId: string) => {
    if (!group || isPreviewMode) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'contributions', contribId));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `contributions/${contribId}`); }
    finally { setActionLoading(false); }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!group || isPreviewMode) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `expenses/${expenseId}`); }
    finally { setActionLoading(false); }
  };

  const updateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !editingContribution || isPreviewMode) return;
    const amount = parseFloat(editContribAmount);
    if (isNaN(amount) || amount < 0) {
      alert("Montant invalide");
      return;
    }

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'contributions', editingContribution.id), {
        amount: amount,
        status: 'approved', // Automatically approve when modified by Chef
        lastUpdated: serverTimestamp()
      });
      setEditingContribution(null);
      setEditContribAmount('');
    } catch (err) { 
      handleFirestoreError(err, OperationType.UPDATE, `contributions/${editingContribution.id}`); 
    }
    finally { setActionLoading(false); }
  };

  const resetUserContributions = async (userId: string) => {
    if (!group || isPreviewMode) return;
    
    setActionLoading(true);
    try {
      const q = query(collection(db, 'contributions'), where('groupId', '==', group.id), where('userId', '==', userId));
      const snap = await getDocs(q);
      const b = writeBatch(db);
      snap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
      setShowMemberContribsModal(false); // Only close after success
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, 'contributions/reset'); }
    finally { setActionLoading(false); }
  };

  const updateUserAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !group || isPreviewMode) return;
    const amount = parseFloat(userAmountInput);
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading(true);
    try {
      // Record a special approved contribution for the user
      await addDoc(collection(db, 'contributions'), {
        groupId: group.id,
        userId: selectedUser.uid,
        userName: selectedUser.name,
        amount: amount,
        status: 'approved',
        date: serverTimestamp(),
        description: 'Ajustement par le Chef',
        isAdjustment: true
      });
      
      setShowUserAmountModal(false);
      setSelectedUser(null);
      setUserAmountInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'contributions');
    } finally {
      setActionLoading(false);
    }
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
    <div className={cn("min-h-screen selection:bg-brand-primary selection:text-white transition-colors duration-500", darkMode ? "dark text-white" : "text-brand-on-background")}>
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
              <h1 className="text-7xl md:text-8xl font-black font-display tracking-tightest mb-6 dark:text-white text-slate-900">
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
                  <h3 className="text-3xl font-black mb-4 group-hover:text-brand-primary transition-colors dark:text-white text-slate-900">Espace Chef</h3>
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
                  <h3 className="text-3xl font-black mb-4 group-hover:text-brand-secondary transition-colors dark:text-white text-slate-900">Mode Utilisateur</h3>
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-12 pl-12 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5 text-slate-900"
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
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pr-12 pl-12 transition-all duration-300 focus:border-brand-secondary outline-none focus:ring-4 focus:ring-brand-secondary/5 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                      <Input 
                        label="Code du Groupe (Optionnel)" 
                        placeholder="Ex: QE-1234" 
                        value={groupCode} 
                        onChange={e => setGroupCode(e.target.value)} 
                        icon={Key}
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
              <h3 className="text-3xl font-black mb-4 dark:text-white">En Attente...</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 px-4">
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
          <>
            <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-32"
          >
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-10 gap-6">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="shrink-0 w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center shadow-xl group">
                  <span className="text-white font-black text-xl">{profile.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-0.5 truncate">{group.name}</p>
                  <h2 className="text-2xl font-black tracking-tight dark:text-white truncate">
                    {profile.name} {isPreviewMode && <span className="text-xs text-brand-primary">(Aperçu)</span>}
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
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
              {activeTab === 'home' && (
                <motion.div 
                  key="home"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {isUserSimplified ? (
                    <motion.div variants={fadeInUp} className="space-y-6">
                      <Card className="brand-gradient text-white border-none !p-8 shadow-2xl shadow-brand-primary/20 group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-10 relative z-10">
                          <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Mes Contributions Validées</p>
                            <motion.h3 className="text-6xl font-black tracking-tighter">
                              ${contributions.filter(c => c.userId === profile.uid && c.status === 'approved').reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}
                            </motion.h3>
                            <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest truncate">Groupe : {group.name}</p>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
                            <Coins className="w-7 h-7" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                          <div className="p-4 bg-white/10 rounded-2xl">
                            <p className="text-[10px] font-black uppercase text-white/60 mb-1">Validées</p>
                            <p className="text-xl font-black">
                              ${contributions.filter(c => c.userId === profile.uid && c.status === 'approved').reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="p-4 bg-white/10 rounded-2xl">
                            <p className="text-[10px] font-black uppercase text-white/60 mb-1">En Attente</p>
                            <p className="text-xl font-black">
                              ${contributions.filter(c => c.userId === profile.uid && c.status === 'pending').reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="!p-6 border-none bg-white dark:bg-slate-900 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h3 className="font-black text-xl tracking-tight dark:text-white">Mes Contributions</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Précision financière</p>
                          </div>
                          <Button variant="secondary" onClick={() => setShowContributionModal(true)} className="!py-2 !px-4 !text-xs !rounded-xl">
                            Signaler Versement
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {contributions.filter(c => c.userId === profile.uid).sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 3).map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-2 h-2 rounded-full", c.status === 'approved' ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
                                <p className="text-sm font-bold">${c.amount.toLocaleString()}</p>
                              </div>
                              <span className="text-[9px] font-black uppercase opacity-60">
                                {c.status === 'approved' ? 'Validé' : 'En attente'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div variants={fadeInUp} className="space-y-6">
                      <Card className="brand-gradient text-white border-none !p-8 shadow-2xl shadow-brand-primary/20 group">
                        <div className="flex justify-between items-start mb-10">
                          <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Solde Actuel de la Team</p>
                            <h3 className="text-4xl sm:text-5xl font-black tracking-tighter dark:text-white truncate">${stats.cashRemaining.toLocaleString()}</h3>
                            <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest truncate">Calculé : Contributions (${stats.totalContributed.toLocaleString()}) - Dépenses (${stats.totalExpenses.toLocaleString()})</p>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
                            <Wallet className="w-7 h-7" />
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.cashPerc}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-white/10 rounded-xl">
                              <p className="text-[9px] font-black uppercase text-white/60 mb-1">Total Contributions</p>
                              <p className="text-lg font-black">${stats.totalContributed.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl">
                              <p className="text-[9px] font-black uppercase text-white/60 mb-1">Total Dépenses</p>
                              <p className="text-lg font-black">${stats.totalExpenses.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </Card>


                    </motion.div>
                  )}

                  {profile.role === 'chef' && !isPreviewMode && (
                    <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button 
                        variant="ghost" 
                        onClick={resetBalance}
                        className="!bg-slate-100 dark:!bg-slate-900 border-none !p-4 !rounded-2xl flex flex-col items-center justify-center gap-2 h-auto"
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

                  {/* Statistics & Analysis - Chef Only */}
                  {!isUserSimplified && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div variants={fadeInUp}>
                          <Card className="!p-5 border-none bg-slate-100 dark:bg-slate-900 group hover:ring-2 hover:ring-brand-primary/20 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4 text-brand-primary">
                              <Coins className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cible Finale</p>
                            <h4 className="text-2xl font-black dark:text-white text-slate-900">${stats.target.toLocaleString()}</h4>
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
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Reste à payer</p>
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
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.analysis}</p>
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
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Pie Chart - Chef Only */}
                    {!isUserSimplified && (
                      <motion.div variants={fadeInUp} className="h-full">
                        <Card className="h-full min-h-[400px]">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-xl tracking-tight flex items-center gap-2">
                              <PieIcon className="w-5 h-5 text-brand-primary" />
                              Répartition de la Team
                            </h3>
                          </div>
                          <div className="h-[300px] w-full relative">
                            {chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
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
                                  <Legend verticalAlign="bottom" height={40}/>
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
                    )}

                    <motion.div variants={fadeInUp} className={cn(!isUserSimplified ? "" : "col-span-2")}>
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
                        <Card className="!p-4 hover:border-brand-primary/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 w-full">
                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                              {idx % 3 === 0 ? <Receipt className="w-6 h-6 text-slate-400" /> : idx % 3 === 1 ? <Coffee className="w-6 h-6 text-slate-400" /> : <CreditCard className="w-6 h-6 text-slate-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[15px] dark:text-white text-slate-900 truncate">{e.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black uppercase text-brand-primary truncate">{e.participantName}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{formatDate(e.date)?.toLocaleDateString() || 'Pending'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                            <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">-${e.amount.toLocaleString()}</p>
                            {profile.role === 'chef' && !isPreviewMode && (
                              <button 
                                onClick={() => deleteExpense(e.id)} 
                                className="text-[9px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors disabled:opacity-50"
                                disabled={actionLoading}
                              >
                                {actionLoading ? '...' : 'SUPPRIMER'}
                              </button>
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
                              <p className={cn("text-2xl font-black tracking-[0.2em] dark:text-white text-slate-900", c.used && "line-through text-slate-400 dark:text-slate-600")}>{c.code}</p>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{c.used ? "Désactivé" : "Prêt à l'emploi"}</span>
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
                            <h4 className="text-xl font-black tracking-tight dark:text-white text-slate-900">{a.title}</h4>
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{formatDate(a.date)?.toLocaleDateString() || 'Récemment'}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{a.message}</p>
                          {profile.role === 'chef' && !isPreviewMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnouncement(a.id);
                              }}
                              className="text-[10px] font-black uppercase text-red-500 hover:underline"
                            >
                              Révoquer
                            </button>
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
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)] overflow-hidden"
                >
                  <Card className="flex-1 flex flex-col !p-0 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 border-none relative">
                    {/* Chat Header */}
                    <div className="shrink-0 p-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shadow-lg">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg tracking-tight dark:text-white text-slate-900 leading-none">Espace Squad</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest uppercase">Canal Sécurisé</p>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{messages.length} Messages</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
                      {messages.map((m, idx) => {
                        const isSelf = m.senderId === profile.uid;
                        const isChef = m.chefId === m.senderId && m.senderId !== "";
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const showAvatar = !isSelf && (prevMsg?.senderId !== m.senderId);

                        return (
                          <motion.div 
                            key={m.id} 
                            initial={{ opacity: 0, x: isSelf ? 20 : -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            className={cn(
                              "flex group transition-all",
                              isSelf ? "justify-end" : "justify-start"
                            )}
                          >
                            <div className={cn(
                              "flex max-w-[92%] sm:max-w-[85%] gap-3 sm:gap-4",
                              isSelf ? "flex-row-reverse" : "flex-row"
                            )}>
                              {/* Avatar/Initial for others */}
                              {!isSelf && (
                                <div className="shrink-0 flex flex-col justify-end pb-2">
                                  {showAvatar ? (
                                    <div className={cn(
                                      "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg",
                                      isChef ? "brand-gradient" : "bg-slate-400"
                                    )}>
                                      {m.senderName.charAt(0).toUpperCase()}
                                    </div>
                                  ) : (
                                    <div className="w-9 sm:w-10" />
                                  )}
                                </div>
                              )}

                              <div className={cn(
                                "flex flex-col min-w-0",
                                isSelf ? "items-end" : "items-start"
                              )}>
                                {showAvatar && (
                                  <span className="text-[10px] font-black uppercase text-slate-400 mb-1.5 px-1 flex items-center gap-1.5">
                                    {m.senderName} 
                                    {isChef && <ShieldCheck className="w-3 h-3 text-brand-primary" />}
                                  </span>
                                )}

                                {editingMessageId === m.id ? (
                                  <div className="flex gap-2 items-center mb-2">
                                    <input
                                      type="text"
                                      value={editingText}
                                      onChange={e => setEditingText(e.target.value)}
                                      className="px-4 py-2 rounded-xl border border-brand-primary text-sm text-slate-900 outline-none focus:ring-4 focus:ring-brand-primary/10 w-full min-w-[200px] bg-white"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateMessage(m.id)}
                                      className="text-[10px] font-black uppercase text-green-500 hover:bg-green-50 px-2 py-1 rounded-md"
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setEditingMessageId(null); setEditingText(''); }}
                                      className="text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 px-2 py-1 rounded-md"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "px-5 py-3.5 sm:px-6 sm:py-4 rounded-[1.25rem] text-sm sm:text-[15px] font-medium shadow-sm transition-all hover:shadow-md leading-relaxed break-words",
                                    isSelf 
                                      ? "brand-gradient text-white rounded-tr-[4px]" 
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-tl-[4px] border border-slate-100 dark:border-white/5",
                                    isChef && !isSelf && "border-brand-primary/20 bg-brand-primary/5 shadow-brand-primary/5"
                                  )}>
                                    {m.text}
                                  </div>
                                )}

                                <div className={cn(
                                  "flex items-center gap-3 mt-1.5 px-1",
                                  isSelf ? "flex-row-reverse" : "flex-row"
                                )}>
                                  <span className={cn(
                                    "text-[9px] font-bold text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity",
                                  )}>
                                    {formatDate(m.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  
                                  {isSelf && !editingMessageId && (
                                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => { setEditingMessageId(m.id); setEditingText(m.text); }}
                                        className="text-[8px] font-black uppercase text-slate-400 hover:text-brand-primary transition-colors"
                                      >
                                        Modifier
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteMessage(m.id)}
                                        className="text-[8px] font-black uppercase text-red-400 hover:text-red-500 transition-colors"
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={msgEndRef} />
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale">
                          <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-6 animate-[spin_10s_linear_infinite]">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="font-black text-[10px] uppercase tracking-[0.2em] text-center max-w-[180px] leading-relaxed">
                            Silence radio...<br/>Soyez le premier à parler !
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Chat Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder="Type message here..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          disabled={isPreviewMode || actionLoading}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-white/5 rounded-2xl py-4 pl-6 pr-14 outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all text-sm font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner text-slate-900 dark:text-white"
                        />
                        <button 
                          type="submit"
                          disabled={!messageText.trim() || isPreviewMode || actionLoading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 brand-gradient text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-brand-primary/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all duration-300 z-10"
                        >
                          <Send className="w-5 h-5 ml-0.5" />
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
                                <h4 className="font-black text-lg leading-none mb-1 dark:text-white text-slate-900">{req.userName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
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
                        <Card className="!p-5 border-none bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-5 w-full sm:w-auto">
                            <div className="shrink-0 w-16 h-16 rounded-[1.5rem] brand-gradient flex items-center justify-center text-white font-black text-2xl shadow-xl">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-lg dark:text-white text-slate-900 truncate">{m.name}</h4>
                                {m.role === 'chef' && <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inscrit le {formatDate(m.createdAt)?.toLocaleDateString() || 'Maintenant'}</p>
                            </div>
                          </div>
                            <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Quota</p>
                                <p className="text-xl font-black text-brand-primary leading-none mt-1">
                                  ${(stats.memberContribs.find(sc => sc.uid === m.uid)?.total || 0).toLocaleString()}
                                </p>
                              </div>
                              {profile.role === 'chef' && !isPreviewMode && (
                                <div className="flex gap-2 shrink-0">
                                  <button 
                                    onClick={() => {
                                      setSelectedUser(m);
                                      setUserAmountInput("");
                                      setShowUserAmountModal(true);
                                    }}
                                    className="text-[9px] font-black uppercase text-brand-secondary hover:text-brand-secondary/80 bg-brand-secondary/10 px-2 py-1 rounded-md transition-colors"
                                  >
                                    Ajouter
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSelectedUser(m);
                                      setShowMemberContribsModal(true);
                                    }}
                                    className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md transition-colors"
                                  >
                                    Gérer
                                  </button>
                                </div>
                              )}
                            </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Navigation */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] sm:w-[calc(100%-48px)] max-w-lg glass-card !rounded-[2.5rem] !p-2 flex justify-around sm:justify-between items-center z-50 !bg-white/80 dark:!bg-slate-900/80 border-slate-200/50 dark:!border-white/5 shadow-2xl overflow-x-auto scrollbar-hide">
              <IconButton icon={LayoutDashboard} label="Tableau" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
              {!isUserSimplified && <IconButton icon={Receipt} label="Journal" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />}
              
              <IconButton icon={Megaphone} label="Actu" active={activeTab === 'news'} onClick={() => setActiveTab('news')} />
              <IconButton icon={MessageSquare} label="Discussion" active={activeTab === 'discussion'} onClick={() => setActiveTab('discussion')} />
              
              {!isUserSimplified && (
                <div className="relative shrink-0">
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
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={{
                  top: -(window.innerHeight - 200),
                  bottom: 0,
                  left: -(window.innerWidth - 80),
                  right: 0,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (activeTab === 'news') {
                    setShowAnnouncementModal(true);
                  } else {
                    setShowExpenseModal(true);
                  }
                }}
                className="fixed bottom-32 right-8 w-16 h-16 rounded-3xl brand-gradient text-white shadow-2xl shadow-brand-primary/40 flex items-center justify-center z-50 premium-shadow cursor-grab active:cursor-grabbing touch-none"
              >
                <Plus className="w-8 h-8" />
              </motion.button>
            )}

            {/* Manage Member Contributions Modal */}
            <Modal
              isOpen={showMemberContribsModal}
              onClose={() => setShowMemberContribsModal(false)}
              title={`Contributions: ${selectedUser?.name}`}
            >
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {contributions.filter(c => c.userId === selectedUser?.uid).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucune contribution pour le moment.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributions
                      .filter(c => c.userId === selectedUser?.uid)
                      .map((c) => (
                        <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                          <div>
                            {editingContribution?.id === c.id ? (
                              <form onSubmit={updateContribution} className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={editContribAmount} 
                                  onChange={e => setEditContribAmount(e.target.value)}
                                  className="w-20 bg-white dark:bg-slate-900 border border-brand-primary rounded-lg px-2 py-1 text-sm outline-none"
                                  autoFocus
                                />
                                <button type="submit" className="text-brand-primary p-1 hover:bg-brand-primary/10 rounded-md" disabled={actionLoading}>
                                  {actionLoading ? (
                                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </button>
                                <button type="button" onClick={() => setEditingContribution(null)} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                                  <X className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <>
                                <p className="text-lg font-black text-brand-primary">${c.amount.toLocaleString()}</p>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest">{formatDate(c.date)?.toLocaleDateString()}</p>
                              </>
                            )}
                          </div>
                          {!editingContribution && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => {
                                  setEditingContribution(c);
                                  setEditContribAmount(c.amount.toString());
                                }}
                                className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-xl transition-all"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteContribution(c.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                disabled={actionLoading}
                              >
                                {actionLoading ? (
                                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-3 text-xs" 
                  onClick={() => {
                    setShowMemberContribsModal(false);
                    setShowUserAmountModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1 py-3 text-xs" 
                  onClick={() => resetUserContributions(selectedUser!.uid)}
                  loading={actionLoading}
                >
                  <RefreshCw className="w-4 h-4" /> Tout effacer
                </Button>
              </div>
            </Modal>

            {/* Existing Add Contribution Modal */}
            <Modal
              isOpen={showUserAmountModal}
              onClose={() => setShowUserAmountModal(false)}
              title={`Ajouter une Contribution`}
            >
              <form onSubmit={updateUserAmount} className="space-y-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center text-white font-black text-2xl mx-auto mb-2 shadow-lg">
                    {selectedUser?.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-black text-lg">{selectedUser?.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">Actuel : ${(stats.memberContribs.find(sc => sc.uid === selectedUser?.uid)?.total || 0).toLocaleString()}</p>
                </div>
                <Input 
                  label="Montant à Ajouter ($)" 
                  placeholder="Ex: 100" 
                  value={userAmountInput} 
                  onChange={e => setUserAmountInput(e.target.value)} 
                  icon={Coins}
                  type="number"
                />
                <Button variant="primary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Ajouter le Montant
                </Button>
              </form>
            </Modal>

            <Modal
              isOpen={showContributionModal}
              onClose={() => setShowContributionModal(false)}
              title="Signaler un Versement"
            >
              <form onSubmit={addContribution} className="space-y-6">
                <Input 
                  label="Montant Versé au Chef ($)" 
                  placeholder="Ex: 50.00" 
                  value={contribAmount} 
                  onChange={e => setContribAmount(e.target.value)} 
                  icon={Coins}
                  type="number"
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                  Le chef devra valider ce montant pour qu'il soit comptabilisé dans le solde de la team.
                </p>
                <Button variant="primary" type="submit" className="w-full py-4 text-lg" loading={actionLoading}>
                  Envoyer Confirmation
                </Button>
              </form>
            </Modal>

            {/* Existing Modals */}
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 transition-all duration-300 focus:border-brand-primary outline-none focus:ring-4 focus:ring-brand-primary/5 min-h-[120px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
        </>
      )}
      </AnimatePresence>
    </div>
  );
}
