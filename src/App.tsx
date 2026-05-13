/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCircle, 
  Vote as VoteIcon, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Camera,
  Upload
} from 'lucide-react';
import { 
  Pemilih, 
  Kandidat, 
  fungsiVoting, 
  fungsiHitungHasil, 
  runTests 
} from './votingSystem';

export default function App() {
  const [role, setRole] = useState<'voter' | 'admin' | null>(null);
  const [adminUsers, setAdminUsers] = useState<{user: string, pass: string}[]>(() => {
    const saved = localStorage.getItem('voting_admins');
    return saved ? JSON.parse(saved) : [{user: 'admin', pass: 'admin123'}];
  }); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ user: '', pass: '' });

  const [candidates, setCandidates] = useState<Kandidat[]>(() => {
    const saved = localStorage.getItem('voting_candidates');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((c: any) => {
        const k = new Kandidat(c.id, c.nama, c.foto);
        k.suara = c.suara;
        return k;
      });
    }
    return [
      new Kandidat('c1', 'Pak Iwan Setiawan'),
      new Kandidat('c2', 'Buk Riza Kartina'),
      new Kandidat('c3', 'Pak Khna Wijaya'),
      new Kandidat('c4', 'Buk Nur Aini Hutagalung'),
      new Kandidat('c5', 'Pak Hermiza'),
    ];
  });
  const [voters, setVoters] = useState<Pemilih[]>(() => {
    const saved = localStorage.getItem('voting_voters');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((v: any) => {
        const p = new Pemilih(v.id, v.nama);
        p.sudahMemilih = v.sudahMemilih;
        return p;
      });
    }
    return [];
  });
  const [voterNameInput, setVoterNameInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'main' | 'results' | 'admin'>('main');
  const [testResults, setTestResults] = useState<ReturnType<typeof runTests> | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // New Candidate Input
  const [newCandidateName, setNewCandidateName] = useState('');
  const [candidatePhoto, setCandidatePhoto] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Kandidat | null>(null);
  // New Voter Input
  const [newVoterName, setNewVoterName] = useState('');

  const stats = useMemo(() => {
    return {
      totalVoters: voters.length,
      totalCandidates: candidates.length,
      votesCast: voters.filter(v => v.sudahMemilih).length
    };
  }, [voters, candidates]);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        setMessage({ text: 'Ukuran foto maksimal 2MB!', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCandidatePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCandidate = () => {
    if (!newCandidateName.trim()) return;
    
    if (editingCandidate) {
      // Update existing
      const updatedCandidates = candidates.map(c => {
        if (c.id === editingCandidate.id) {
          c.nama = newCandidateName;
          c.foto = candidatePhoto || undefined;
        }
        return c;
      });
      setCandidates(updatedCandidates);
      setMessage({ text: `Data ${newCandidateName} berhasil diperbarui!`, type: 'success' });
      setEditingCandidate(null);
    } else {
      // Add new
      const newK = new Kandidat(Date.now().toString(), newCandidateName, candidatePhoto || undefined);
      setCandidates([...candidates, newK]);
      setMessage({ text: `Dosen ${newCandidateName} berhasil ditambahkan!`, type: 'success' });
    }

    setNewCandidateName('');
    setCandidatePhoto(null);
  };

  const startEdit = (candidate: Kandidat) => {
    setEditingCandidate(candidate);
    setNewCandidateName(candidate.nama);
    setCandidatePhoto(candidate.foto || null);
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingCandidate(null);
    setNewCandidateName('');
    setCandidatePhoto(null);
  };

  const addVoter = () => {
    if (!newVoterName.trim()) return;
    const newV = new Pemilih(Date.now().toString(), newVoterName);
    setVoters([...voters, newV]);
    setNewVoterName('');
  };

  const handleVote = (candidateId: string) => {
    const trimmedName = voterNameInput.trim();
    if (!trimmedName) {
      setMessage({ text: 'Masukkan nama Anda terlebih dahulu!', type: 'error' });
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    let currentVoters = [...voters];
    // Find voter by name (Case-insensitive check for duplication prevention)
    let voter = currentVoters.find(v => v.nama.toLowerCase() === trimmedName.toLowerCase());

    if (voter) {
      if (voter.sudahMemilih) {
        setMessage({ text: 'Nama ini sudah memberikan suara!', type: 'error' });
        return;
      }
    } else {
      // Auto-register new manual voter
      voter = new Pemilih(Date.now().toString(), trimmedName);
      currentVoters.push(voter);
    }

    const success = fungsiVoting(voter, candidate);
    if (success) {
      setVoters(currentVoters);
      setCandidates([...candidates]); // Trigger re-render for candidates count
      setMessage({ text: `Terima kasih ${voter.nama}, suara Anda telah dicatat.`, type: 'success' });
      setVoterNameInput('');
    } else {
      setMessage({ text: 'Terjadi kesalahan saat pemungutan suara.', type: 'error' });
    }
  };

  const executeTests = () => {
    const results = runTests();
    setTestResults(results);
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem('voting_candidates', JSON.stringify(candidates));
    localStorage.setItem('voting_voters', JSON.stringify(voters));
    localStorage.setItem('voting_admins', JSON.stringify(adminUsers));
  }, [candidates, voters, adminUsers]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!role) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden frosted-bg p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f61a_0%,transparent_40%),radial-gradient(circle_at_70%_80%,#8b5cf61a_0%,transparent_40%)] pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass p-10 rounded-[3rem] text-center space-y-8 relative z-10"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-500/40">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-100">Voting Dosen Informatika Terfavorite</h1>
              <p className="text-blue-300/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Select Access Portal</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => { setRole('voter'); setActiveTab('main'); }}
              className="w-full group glass p-6 rounded-2xl flex items-center gap-4 hover:bg-white hover:text-black transition-all text-left"
            >
              <div className="p-3 bg-blue-500/20 group-hover:bg-blue-600 rounded-xl transition-colors">
                <VoteIcon className="w-6 h-6 text-blue-400 group-hover:text-white" />
              </div>
              <div>
                <p className="font-black italic uppercase text-sm tracking-tight">Portal Pemilih</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Berikan Suara Anda</p>
              </div>
            </button>

            <button 
              onClick={() => { setRole('admin'); setIsAdminLoggedIn(false); setAuthMode('login'); }}
              className="w-full group glass p-6 rounded-2xl flex items-center gap-4 hover:bg-white hover:text-black transition-all text-left"
            >
              <div className="p-3 bg-purple-500/20 group-hover:bg-purple-600 rounded-xl transition-colors">
                <Settings className="w-6 h-6 text-purple-400 group-hover:text-white" />
              </div>
              <div>
                <p className="font-black italic uppercase text-sm tracking-tight">Portal Admin</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Kontrol & Validasi</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin Auth Gate
  if (role === 'admin' && !isAdminLoggedIn) {
    const handleAuth = () => {
      if (!authForm.user || !authForm.pass) {
        setMessage({ text: 'Mohon isi semua field!', type: 'error' });
        return;
      }

      if (authMode === 'register') {
        if (adminUsers.find(u => u.user === authForm.user)) {
          setMessage({ text: 'Username sudah digunakan!', type: 'error' });
          return;
        }
        setAdminUsers([...adminUsers, authForm]);
        setMessage({ text: 'Registrasi Admin Berhasil! Silahkan login.', type: 'success' });
        setAuthMode('login');
        setAuthForm({ user: '', pass: '' });
      } else {
        const found = adminUsers.find(u => u.user === authForm.user && u.pass === authForm.pass);
        if (found) {
          setIsAdminLoggedIn(true);
          setActiveTab('admin');
          setMessage({ text: `Selamat datang kembali, ${found.user}!`, type: 'success' });
        } else {
          setMessage({ text: 'Username atau Password salah!', type: 'error' });
        }
      }
    };

    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden frosted-bg p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f61a_0%,transparent_40%),radial-gradient(circle_at_70%_80%,#8b5cf61a_0%,transparent_40%)] pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-10 rounded-[3rem] space-y-8 relative z-10"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">{authMode === 'login' ? 'Admin Login' : 'Admin Register'}</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Authorized Personnel Only</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text"
                value={authForm.user}
                onChange={(e) => setAuthForm({...authForm, user: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/50 text-white font-medium placeholder-white/10"
                placeholder="Masukkan username..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password"
                value={authForm.pass}
                onChange={(e) => setAuthForm({...authForm, pass: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/50 text-white font-medium placeholder-white/10"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              onClick={handleAuth}
              className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-xl shadow-white/5 mt-4"
            >
              {authMode === 'login' ? 'Masuk Portal' : 'Daftar Sekarang'}
            </button>

            <div className="text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest transition-colors underline-offset-4 underline"
              >
                {authMode === 'login' ? 'Belum punya akun? Registrasi Admin' : 'Sudah punya akun? Login Admin'}
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setRole(null)}
            className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Kembali ke Beranda</span>
          </button>
        </motion.div>
        
        {/* Toast inside Auth View */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-8 px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-4 border ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}
            >
              <span className="font-bold text-sm tracking-wide">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col relative overflow-hidden frosted-bg">
      {/* Decorative Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f61a_0%,transparent_40%),radial-gradient(circle_at_70%_80%,#8b5cf61a_0%,transparent_40%)] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => { setRole(null); setIsAdminLoggedIn(false); }} className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all">
              <RefreshCcw className="text-white/40 w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-100 italic">Voting Dosen Informatika Terfavorite</h1>
          </div>
          <p className="text-blue-300/40 text-[10px] font-bold uppercase tracking-[0.3em] ml-11">
            {role === 'admin' ? 'Admin Control Unit' : 'Student Voting Booth'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            {role === 'voter' ? (
              <>
                {[
                  { id: 'main', label: 'Voting', icon: VoteIcon },
                  { id: 'results', label: 'Hasil', icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-white/10' 
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: 'admin', label: 'Dashboard', icon: Settings },
                  { id: 'results', label: 'Hasil Suara', icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                      activeTab === tab.id 
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 border border-white/10' 
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </>
            )}
          </nav>

          {role === 'admin' && isAdminLoggedIn && (
            <button 
              onClick={() => { setIsAdminLoggedIn(false); setRole(null); }}
              className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500 transition-all hover:text-white shadow-lg"
              title="Keluar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-8 space-y-8 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Toast Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-4 border ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
              <span className="font-bold text-sm tracking-wide">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard icon={Users} label="Total Pemilih" value={stats.totalVoters} color="blue" />
          <StatCard icon={UserCircle} label="Total Kandidat" value={stats.totalCandidates} color="indigo" />
          <StatCard icon={VoteIcon} label="Suara Masuk" value={stats.votesCast} color="emerald" />
        </div>

        {/* Content Tabs */}
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-12 gap-8"
            >
              {/* Voter Identity Section */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="glass p-6 rounded-3xl space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Login Identitas</h2>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <ShieldCheck className="w-4 h-4 text-white/30" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Input Nama Pemilih</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/50" />
                        <input 
                          type="text"
                          placeholder="Masukkan Nama Lengkap..."
                          value={voterNameInput}
                          onChange={(e) => setVoterNameInput(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white font-semibold placeholder-white/20"
                        />
                      </div>
                      <p className="px-1 text-[9px] text-white/20 font-medium italic">Sistem akan memverifikasi duplikasi berdasarkan nama.</p>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-3xl bg-blue-600/10 border-blue-500/20">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-blue-500/20 rounded-2xl">
                      <AlertCircle className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-100 text-sm mb-1">Panduan Memilih</h4>
                      <p className="text-xs text-blue-300/60 leading-relaxed font-medium">Satu pemilih hanya berhak memberikan satu kali suara secara sah. Sistem kami mendeteksi duplikasi secara real-time.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidates Grid */}
              <div className="col-span-12 lg:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {candidates.length === 0 ? (
                    <div className="col-span-full py-16 text-center glass border-dashed rounded-3xl flex flex-col items-center justify-center gap-4">
                      <Users className="w-12 h-12 text-white/10" />
                      <p className="text-white/20 font-bold uppercase tracking-widest text-xs italic">Menunggu Data Kandidat Masuk...</p>
                    </div>
                  ) : (
                    candidates.map((cand, idx) => {
                      const colors = [
                        'from-blue-500 to-indigo-600',
                        'from-purple-500 to-pink-600',
                        'from-emerald-500 to-teal-600',
                        'from-amber-500 to-orange-600'
                      ];
                      return (
                        <motion.div
                          key={cand.id}
                          whileHover={{ y: -8, scale: 1.02 }}
                          className="glass p-8 rounded-[2.5rem] relative group"
                        >
                          <div className="flex flex-col items-center gap-6 text-center">
                            <div className={`w-28 h-28 bg-gradient-to-tr ${colors[idx % colors.length]} rounded-full p-1.5 shadow-2xl overflow-hidden`}>
                              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-3xl font-black italic tracking-tighter overflow-hidden">
                                {cand.foto ? (
                                  <img src={cand.foto} alt={cand.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  cand.nama.charAt(0)
                                )}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-white italic tracking-tight">{cand.nama}</h3>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em] mt-1">Lecturer ID #{cand.id.slice(-4)}</p>
                            </div>
                            <button
                              onClick={() => handleVote(cand.id)}
                              disabled={!voterNameInput.trim()}
                              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                                !voterNameInput.trim() 
                                  ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed' 
                                  : 'bg-white text-black hover:bg-blue-500 hover:text-white shadow-xl shadow-white/5 border border-white/10'
                              }`}
                            >
                              <VoteIcon className="w-5 h-5" />
                              Pilih Sekarang
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass p-12 rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mt-32 blur-[100px]"></div>
                
                <div className="flex items-center justify-between mb-12 relative z-10">
                  <div>
                    <h2 className="text-4xl font-black text-white italic mb-2 tracking-tighter">Hasil Real-Time</h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em]">Telemetry Booth Data Feed</p>
                  </div>
                  <div className="bg-blue-600/20 p-5 rounded-3xl border border-blue-500/30">
                    <BarChart3 className="text-blue-400 w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-12 relative z-10">
                  {candidates.length === 0 ? (
                    <div className="text-center py-20 glass-dark rounded-3xl border border-white/5 text-white/20 uppercase font-black tracking-widest italic">Data Not Synchronized</div>
                  ) : (
                    candidates
                      .sort((a, b) => b.suara - a.suara)
                      .map((cand, idx) => {
                        const percentage = stats.votesCast > 0 ? (cand.suara / stats.votesCast) * 100 : 0;
                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'];
                        return (
                          <div key={cand.id} className="space-y-4">
                            <div className="flex justify-between items-end px-1">
                              <div className="flex items-center gap-5">
                                <div className="relative group">
                                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black italic text-xl overflow-hidden ${idx === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/10 text-white/50'}`}>
                                    {cand.foto ? (
                                      <img src={cand.foto} alt={cand.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      cand.nama.charAt(0)
                                    )}
                                  </span>
                                  <div className="absolute -top-1 -left-1 w-6 h-6 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                                    {idx + 1}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-2xl font-black text-white uppercase italic tracking-tighter">{cand.nama}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Status: Evaluated</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-4xl font-black text-white tracking-tighter">{percentage.toFixed(0)}%</p>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{cand.suara} Total Votes</p>
                              </div>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full p-1 overflow-hidden backdrop-blur-md border border-white/5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1.5, ease: 'circOut' }}
                                className={`h-full rounded-full ${colors[idx % colors.length]} relative`}
                              >
                                {idx === 0 && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                              </motion.div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-12 gap-8"
            >
              {/* Registration List */}
              <div className="col-span-12 lg:col-span-7 space-y-8">
                <div className="glass p-8 rounded-[3rem] space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white italic tracking-tight">Data Kontrol Dosen</h3>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Master Entry Points</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
                          {candidatePhoto ? (
                            <img src={candidatePhoto} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-6 h-6 text-white/20" />
                          )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl cursor-pointer hover:bg-blue-500 transition-colors shadow-lg border border-white/10">
                          <Upload className="w-3 h-3 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">
                          {editingCandidate ? 'Edit Nama Dosen' : 'Nama Lengkap Dosen'}
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Dr. Ir. Nama Dosen, M.T."
                          value={newCandidateName}
                          onChange={(e) => setNewCandidateName(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-white/20"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={saveCandidate}
                        className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-500 hover:text-white transition-all shadow-xl"
                      >
                        {editingCandidate ? 'Simpan Perubahan' : 'Daftarkan Dosen'}
                      </button>
                      {editingCandidate && (
                        <button 
                          onClick={cancelEdit}
                          className="px-6 bg-white/5 text-white/40 border border-white/10 rounded-2xl font-black uppercase text-xs hover:bg-white/10 hover:text-white transition-all"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {candidates.map(c => (
                      <div key={c.id} className="group glass-dark p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:border-white/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center font-bold text-blue-400 border border-blue-500/20 overflow-hidden">
                            {c.foto ? (
                              <img src={c.foto} alt={c.nama} className="w-full h-full object-cover" />
                            ) : (
                              c.nama.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase italic">{c.nama}</p>
                            <p className="text-[10px] text-white/30 font-mono tracking-tighter">UID: {c.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => startEdit(c)} 
                            className="p-3 text-white/10 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                            title="Edit Dosen"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('Apakah Anda yakin ingin menghapus kandidat ini? Semua suara untuk kandidat ini akan hilang.')) {
                                setCandidates(candidates.filter(x => x.id !== c.id));
                                setMessage({ text: 'Kandidat berhasil dihapus.', type: 'success' });
                              }
                            }} 
                            className="p-3 text-white/10 group-hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Hapus Dosen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight">Registri Mahasiswa Pemilih</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Verified Student Database</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Input Nama Mahasiswa Baru..."
                      value={newVoterName}
                      onChange={(e) => setNewVoterName(e.target.value)}
                      className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-purple-500/50 outline-none text-white placeholder-white/20"
                    />
                    <button 
                      onClick={addVoter}
                      className="bg-blue-600 text-white px-8 rounded-2xl font-black uppercase text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-blue-600/20"
                    >
                      Daftar
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {voters.map(v => (
                      <div key={v.id} className="group glass-dark p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:border-white/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${v.sudahMemilih ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/20 border-white/5'}`}>
                            {v.sudahMemilih ? <VoteIcon className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase italic">{v.nama}</p>
                            <p className="text-[10px] text-white/30 font-mono tracking-tighter">Verified Status: {v.sudahMemilih ? 'Voted' : 'Eligible'}</p>
                          </div>
                        </div>
                        <button onClick={() => setVoters(voters.filter(x => x.id !== v.id))} className="p-3 text-white/10 group-hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Test Suite Telemetry */}
              <div className="col-span-12 lg:col-span-5">
                <div className="glass-dark border-white/10 shadow-2xl rounded-[3rem] p-10 space-y-8 sticky top-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Test Suite Telemetry</h2>
                      <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Integrity Validator</h3>
                    </div>
                    <button 
                      onClick={executeTests}
                      className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all text-blue-400"
                    >
                      <RefreshCcw className="w-5 h-5 flex-shrink-0" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <TelemetryItem label="Unit Test: Voting" status={testResults?.unitTestVoting} />
                    <TelemetryItem label="Unit Test: Hitung Suara" status={testResults?.unitTestHitungSuara} />
                    <TelemetryItem label="Integration: E-Voting" status={testResults?.integrationTest} />
                  </div>

                  <div className="pt-8 border-t border-white/5 space-y-4">
                    <div className="flex justify-between text-[10px] font-mono text-white/20 uppercase">
                      <span>Sync Mode</span>
                      <span>Real-Time Atomic</span>
                    </div>
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black font-mono text-blue-400/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
                        Live Output Stream
                      </p>
                      <div className="space-y-1 font-mono text-[10px] text-white/50 lowercase leading-relaxed">
                        <p>&gt; sys_verifying_identities: ok</p>
                        <p>&gt; mem_pool_validation: active</p>
                        <p>&gt; trace_id: {new Date().getTime().toString(16)}</p>
                        {testResults && (
                          <p className="text-emerald-400/60">&gt; all tests finalized with status PASS</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-8 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-8 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
          <span>System Integrity Verified</span>
          <div className="w-1 h-1 rounded-full bg-white/10"></div>
          <span>No Duplicates Policy Active</span>
          <div className="w-1 h-1 rounded-full bg-white/10"></div>
          <span className="font-mono tracking-tighter">v2.0.4-LTS</span>
        </div>
      </footer>
    </div>
  );
}

function TelemetryItem({ label, status }: { label: string, status: string | undefined }) {
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';

  return (
    <div className={`p-5 rounded-[1.5rem] border transition-all flex items-center justify-between ${
      !status ? 'bg-white/5 border-white/5 opacity-50' : 
      isPass ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
    }`}>
      <span className={`text-[11px] font-bold uppercase tracking-widest ${!status ? 'text-white/20' : isPass ? 'text-emerald-300' : 'text-rose-300'}`}>
        {label}
      </span>
      <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-tighter ${
        !status ? 'bg-white/10 text-white/40' : 
        isPass ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
      }`}>
        {status || 'WAITING'}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: 'blue' | 'purple' | 'indigo' | 'emerald' }) {
  const colors = {
    blue: 'from-blue-500/20 to-indigo-600/20 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-pink-600/20 text-purple-400 border-purple-500/20',
    indigo: 'from-indigo-500/20 to-blue-600/20 text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/20'
  };
  
  return (
    <div className="glass p-6 rounded-[2rem] flex items-center gap-5 group hover:border-white/20 transition-all">
      <div className={`p-4 rounded-2xl bg-gradient-to-br shadow-inner border ${colors[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
