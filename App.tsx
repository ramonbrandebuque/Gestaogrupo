import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';

// --- CONFIGURATION ---
const HARDCODED_URL = 'https://script.google.com/macros/s/AKfycbxCKCU0IvpMKOD_5R574da4pQSDzwJiNC6W9ZDo9Yo63mWqFsAmiSkdMQXhh9t5Q3Df/exec'; 

// @ts-ignore
const env = import.meta.env; 
const API_URL = (env && env.VITE_API_URL) || HARDCODED_URL;

// --- Types ---
type PageType = 'dashboard' | 'new-bet' | 'ledger' | 'bettors' | 'ranking' | 'reports' | 'access';
type BetStatus = 'PENDING' | 'WIN' | 'LOSS';

interface Selection {
  id: string;
  event: string;
  pick: string;
  odds: number;
}

interface Bet {
  id: number;
  date: string;
  bettor: string;
  type: 'Simples' | 'Múltipla';
  stake: number;
  totalOdds: number;
  potentialProfit: number;
  status: BetStatus;
  isCashout?: boolean;
  selections: Selection[];
}

interface Bettor {
  id: number;
  name: string;
  date: string;
  status: 'Ativo' | 'Inativo';
  avatar?: string;
}

interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  avatar?: string;
}

interface UserSession {
  username: string;
  role: 'admin' | 'editor' | 'viewer';
  name: string;
  avatar?: string;
}

// Mock Data
const performanceData = [
  { name: 'S1', value: 0 },
  { name: 'S2', value: 0 },
  { name: 'S3', value: 0 },
  { name: 'S4', value: 0 },
];

// --- Helper Functions ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const filterBetsByPeriod = (bets: Bet[], period: string, start?: string, end?: string) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  return bets.filter(bet => {
    if (!bet.date) return false;
    const betDateStr = bet.date.split('T')[0];
    
    switch (period) {
      case 'Hoje': return betDateStr === todayStr;
      case 'Mês':
        const betDate = new Date(betDateStr + 'T12:00:00'); 
        return betDate.getMonth() === now.getMonth() && betDate.getFullYear() === now.getFullYear();
      case 'Ano':
        const betDateY = new Date(betDateStr + 'T12:00:00'); 
        return betDateY.getFullYear() === now.getFullYear();
      case 'Periodo':
        if (!start || !end) return true;
        return betDateStr >= start && betDateStr <= end;
      default: return true;
    }
  });
};

const Avatar = ({ url, name, size = 'md', className = '' }: { url?: string, name: string, size?: 'sm'|'md'|'lg'|'xl', className?: string }) => {
    const sizeClasses = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-24 text-3xl' };
    if (url && url.length > 5) {
        return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border border-white/10 ${className}`} />;
    }
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-dark-700 flex items-center justify-center font-bold text-gray-300 uppercase border border-white/10 ${className}`}>
            {name ? name.substring(0, 2) : '??'}
        </div>
    );
};

const apiPost = async (payload: any) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await response.json();
  } catch (error) {
    console.error("API POST Error:", error);
    throw error;
  }
};

const IceLogo = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => {
    const isSmall = size === 'sm';
    return (
        <div className={`${isSmall ? 'size-10' : 'size-20'} rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg ring-1 ring-white/20`}>
            <span className={`material-symbols-outlined ${isSmall ? 'text-xl' : 'text-5xl'} text-white`}>ac_unit</span>
        </div>
    );
};

// --- Components ---

const LoginPage = ({ onLogin, users, isLoading }: { onLogin: (session: UserSession) => void, users: User[], isLoading: boolean }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputUser = username.trim().toLowerCase();
    const user = users.find(u => (u.username || '').toLowerCase() === inputUser && String(u.password || '') === password);

    if (user) {
      if (user.status !== 'Ativo') {
        setError('Usuário inativo.');
        return;
      }
      onLogin({ username: user.username, role: user.role, name: user.name, avatar: user.avatar });
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
      <div className="w-full max-w-md bg-dark-900 border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8 gap-4">
          <IceLogo size="lg" />
          <div className="text-center">
             <h1 className="text-xl font-black text-white uppercase tracking-wider">Gestão de Apostas<br/>em Grupo</h1>
             <p className="text-gray-400 text-xs mt-2">Acesse sua conta</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-500 outline-none" placeholder="Usuário" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-500 outline-none" placeholder="Senha" />
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          <button disabled={isLoading} type="submit" className="mt-2 w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 text-white font-bold py-3 rounded-lg shadow-lg">
             {isLoading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ activePage, setPage, user, onLogout, isOpen, onClose }: any) => {
  const isAdmin = user.role === 'admin';
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    ...(isAdmin ? [{ id: 'new-bet', label: 'Nova Aposta', icon: 'add_circle' }] : []),
    { id: 'ledger', label: 'Histórico', icon: 'receipt_long' },
    { id: 'bettors', label: 'Apostadores', icon: 'groups' },
    { id: 'ranking', label: 'Ranking', icon: 'emoji_events' },
    { id: 'reports', label: 'Relatórios', icon: 'bar_chart' },
    ...(isAdmin ? [{ id: 'access', label: 'Acessos', icon: 'admin_panel_settings' }] : []),
  ];

  return (
    <>
        {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={onClose}></div>}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-white/5 flex flex-col h-full transition-transform duration-300 md:translate-x-0 md:relative ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full justify-between p-4">
            <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2 pt-2">
                <IceLogo size="sm" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-white text-xs font-black uppercase leading-tight">Gestão de Apostas<br/>em Grupo</h1>
                </div>
                <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <nav className="flex flex-col gap-1">
                {menuItems.map((item) => (
                <button key={item.id} onClick={() => { setPage(item.id); onClose(); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${activePage === item.id ? 'bg-brand-500/10 text-brand-400' : 'text-gray-400 hover:text-white'}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {item.label}
                </button>
                ))}
            </nav>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
            <div className="flex items-center gap-3 px-2">
                <Avatar url={user.avatar} name={user.name} size="sm" />
                <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
            </div>
            <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-lg h-9 px-4 border border-white/10 hover:bg-white/5 text-gray-400 text-sm font-medium"><span className="material-symbols-outlined">logout</span> Sair</button>
            </div>
        </div>
        </aside>
    </>
  );
};

const DashboardPage = ({ bets, onNewBet, isAdmin }: { bets: Bet[], onNewBet: () => void, isAdmin: boolean }) => {
  const totalBankroll = bets.reduce((acc, bet) => acc + (Number(bet.stake)||0), 0);
  const totalProfit = bets.reduce((acc, bet) => {
    if (bet.status === 'WIN') return acc + (Number(bet.potentialProfit)||0);
    if (bet.status === 'LOSS') return acc - (Number(bet.stake)||0);
    return acc;
  }, 0);
  
  const chartData = useMemo(() => {
     if (bets.length === 0) return performanceData;
     const grouped = bets.reduce((acc: any, bet) => {
         const d = bet.date.split('T')[0];
         if (!acc[d]) acc[d] = 0;
         if (bet.status === 'WIN') acc[d] += Number(bet.potentialProfit);
         if (bet.status === 'LOSS') acc[d] -= Number(bet.stake);
         return acc;
     }, {});
     let runningTotal = 0;
     return Object.keys(grouped).sort().map(date => {
         runningTotal += grouped[date];
         return { name: date.substring(5), value: runningTotal };
     });
  }, [bets]);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div><h2 className="text-3xl font-black text-white">Visão Geral</h2><p className="text-gray-400">Resumo de desempenho.</p></div>
        {isAdmin && <button onClick={onNewBet} className="flex gap-2 items-center rounded-lg h-10 px-5 bg-brand-500 text-white font-bold w-full md:w-auto justify-center"><span className="material-symbols-outlined">add</span> Nova Aposta</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Valor Investido', value: formatCurrency(totalBankroll), color: 'text-white' },
          { title: 'Lucro/Prejuízo', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'text-success-400' : 'text-red-400' },
          { title: 'Apostas Ativas', value: bets.filter(b => b.status === 'PENDING').length.toString(), color: 'text-white' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-6 bg-dark-800 border border-white/5">
            <p className="text-gray-400 text-sm font-medium uppercase">{stat.title}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-xl border border-white/5 bg-dark-800 h-[300px] p-6">
        <h3 className="text-white text-lg font-bold mb-4">Evolução de Ganhos</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const NewBetPage = ({ onSave, onCancel, editBet, bettors }: { onSave: (bet: Bet) => void, onCancel: () => void, editBet: Bet | null, bettors: Bettor[] }) => {
  const [bettor, setBettor] = useState(editBet?.bettor || '');
  const [stake, setStake] = useState<string>(editBet?.stake.toString() || '100.00'); // Default to 100
  const [selections, setSelections] = useState<Selection[]>(editBet?.selections || [{ id: Date.now().toString(), event: '', pick: '', odds: 1.0 }]);

  const updateSelection = (id: string, field: keyof Selection, value: string | number) => {
    setSelections(selections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalOdds = selections.reduce((acc, curr) => acc * (curr.odds || 1), 1);
  const numericStake = parseFloat(stake) || 0;
  const potentialProfit = (numericStake * totalOdds) - numericStake;

  const handleSave = () => {
    if (!bettor || numericStake <= 0) return alert("Preencha os campos obrigatórios.");
    onSave({
      id: editBet?.id || Date.now(),
      date: editBet?.date || new Date().toISOString().split('T')[0],
      bettor, 
      type: selections.length > 1 ? 'Múltipla' : 'Simples',
      stake: numericStake, 
      totalOdds,
      potentialProfit,
      status: editBet?.status || 'PENDING',
      isCashout: false,
      selections
    });
  };

  return (
    <div className="max-w-[960px] mx-auto w-full flex flex-col gap-6">
      <h1 className="text-white text-3xl font-black">{editBet ? 'Editar Aposta' : 'Nova Aposta'}</h1>
      <div className="bg-dark-800 rounded-xl border border-white/5 p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">Apostador</label>
            <select value={bettor} onChange={(e) => setBettor(e.target.value)} className="h-12 rounded-lg bg-dark-900 border border-white/5 text-white px-4 outline-none focus:border-brand-500">
                <option value="">Selecione...</option>
                {bettors.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
        </div>
        {selections.map(sel => (
          <div key={sel.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg border border-white/5 bg-dark-700/50">
            <input className="col-span-5 bg-transparent border-b border-gray-600 text-white outline-none" placeholder="Evento" value={sel.event} onChange={(e) => updateSelection(sel.id, 'event', e.target.value)} />
            <input className="col-span-5 bg-transparent border-b border-gray-600 text-white outline-none" placeholder="Aposta" value={sel.pick} onChange={(e) => updateSelection(sel.id, 'pick', e.target.value)} />
            <input type="number" step="0.01" className="col-span-2 bg-transparent border-b border-gray-600 text-white outline-none text-right" value={sel.odds} onChange={(e) => updateSelection(sel.id, 'odds', parseFloat(e.target.value))} />
          </div>
        ))}
        <button onClick={() => setSelections([...selections, { id: Date.now().toString(), event: '', pick: '', odds: 1.0 }])} className="text-brand-400 text-sm font-medium self-start hover:underline">+ Adicionar Jogo</button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <div className="bg-dark-900 p-4 rounded-lg border border-white/5">
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Odd Total</p>
            <p className="text-2xl font-black text-white">{totalOdds.toFixed(2)}</p>
          </div>
          <div className="bg-dark-900 p-4 rounded-lg border border-white/5">
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Valor (R$)</p>
            <input type="number" className="w-full bg-transparent text-2xl font-black text-white outline-none" value={stake} onChange={(e) => setStake(e.target.value)} />
          </div>
          <div className="bg-dark-900 p-4 rounded-lg border border-white/5">
            <p className="text-xs text-brand-400 uppercase font-bold mb-1">Lucro Potencial</p>
            <p className="text-2xl font-black text-white">R$ {potentialProfit.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-6 py-3 rounded-lg text-gray-400 hover:bg-dark-900">Cancelar</button>
          <button onClick={handleSave} className="px-8 py-3 rounded-lg bg-brand-500 text-white font-bold">Salvar Aposta</button>
        </div>
      </div>
    </div>
  );
};

const RankingPage = ({ bets, bettors }: { bets: Bet[], bettors: Bettor[] }) => {
  const ranking = useMemo(() => {
    const stats: Record<string, { name: string, profit: number, bets: number, wins: number }> = {};
    bettors.forEach(b => { stats[b.name] = { name: b.name, profit: 0, bets: 0, wins: 0 }; });
    bets.forEach(bet => {
      if (!stats[bet.bettor]) stats[bet.bettor] = { name: bet.bettor, profit: 0, bets: 0, wins: 0 };
      if (bet.status !== 'PENDING') {
         stats[bet.bettor].bets += 1;
         if (bet.status === 'WIN') {
            stats[bet.bettor].wins += 1;
            stats[bet.bettor].profit += (Number(bet.potentialProfit) || 0);
         } else if (bet.status === 'LOSS') {
            stats[bet.bettor].profit -= (Number(bet.stake) || 0);
         }
      }
    });
    return Object.values(stats).sort((a, b) => b.profit - a.profit).map((s, i) => ({ ...s, rank: i + 1 }));
  }, [bets, bettors]);

  return (
     <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full">
        <h2 className="text-3xl font-black text-white">Ranking</h2>
        <div className="flex flex-col gap-3">
           {ranking.map((r) => (
              <div key={r.name} className="flex items-center p-4 bg-dark-800 border border-white/5 rounded-xl gap-4">
                 <div className={`size-8 flex items-center justify-center rounded-full font-bold ${r.rank === 1 ? 'bg-yellow-500 text-black' : r.rank === 2 ? 'bg-gray-400 text-black' : r.rank === 3 ? 'bg-amber-700 text-white' : 'bg-dark-700 text-gray-400'}`}>{r.rank}</div>
                 <div className="flex-1">
                    <p className="text-white font-bold">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.bets} apostas • {r.bets > 0 ? ((r.wins / r.bets) * 100).toFixed(0) : 0}% winrate</p>
                 </div>
                 <div className={`font-mono font-bold text-lg ${r.profit >= 0 ? 'text-success-400' : 'text-red-400'}`}>{formatCurrency(r.profit)}</div>
              </div>
           ))}
        </div>
     </div>
  );
};

const LedgerPage = ({ bets, onEdit, onDelete, onUpdateStatus, onNewBet, isAdmin }: { bets: Bet[], onEdit: (b:Bet)=>void, onDelete: (id:number)=>void, onUpdateStatus: (id:number, s:BetStatus, p?:number, c?:boolean)=>void, onNewBet: ()=>void, isAdmin: boolean }) => {
  const [filter, setFilter] = useState('Geral');
  const filteredBets = useMemo(() => filterBetsByPeriod(bets, filter), [bets, filter]);

  const handleStatusChange = (bet: Bet, status: BetStatus) => {
      if (status === 'WIN') onUpdateStatus(bet.id, 'WIN', bet.potentialProfit);
      else if (status === 'LOSS') onUpdateStatus(bet.id, 'LOSS');
  };
  
  const handleCashout = (bet: Bet) => {
      const val = prompt('Valor do Cashout (R$):', bet.stake.toString());
      if (val) {
          const cashoutValue = parseFloat(val); 
          const profit = cashoutValue - bet.stake;
          onUpdateStatus(bet.id, 'WIN', profit, true);
      }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-black text-white">Histórico</h2>
            <div className="flex gap-2 bg-dark-800 p-1 rounded-lg border border-white/5">
                {['Geral', 'Hoje', 'Mês'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>{f}</button>
                ))}
            </div>
        </div>
        <div className="grid gap-4">
            {filteredBets.length === 0 && <p className="text-center text-gray-500 py-10">Nenhuma aposta encontrada.</p>}
            {filteredBets.map(bet => (
                <div key={bet.id} className="bg-dark-800 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${bet.status === 'WIN' ? 'bg-success-500/20 text-success-400' : bet.status === 'LOSS' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                               {bet.isCashout ? 'Cashout' : (bet.status === 'WIN' ? 'Green' : bet.status === 'LOSS' ? 'Red' : 'Pendente')}
                           </span>
                           <span className="text-xs text-gray-500">{new Date(bet.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-white font-bold truncate">{bet.bettor}</p>
                        <div className="flex flex-col gap-1">
                            {bet.selections.map((s, i) => (
                                <p key={i} className="text-xs text-gray-300"><span className="text-gray-500">{s.event}:</span> {s.pick} <span className="text-brand-400">@{s.odds}</span></p>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col md:items-end justify-center gap-1">
                        <p className="text-xs text-gray-500 uppercase font-bold">Stake / Retorno</p>
                        <div className="flex items-baseline gap-2">
                             <span className="text-gray-400 line-through text-sm">{formatCurrency(bet.stake)}</span>
                             <span className={`font-mono font-bold text-lg ${bet.status === 'WIN' ? 'text-success-400' : bet.status === 'LOSS' ? 'text-gray-500' : 'text-white'}`}>
                                 {bet.status === 'LOSS' ? formatCurrency(0) : formatCurrency(bet.stake + (bet.status === 'WIN' ? bet.potentialProfit : bet.potentialProfit))} 
                             </span>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-4 mt-2 md:mt-0">
                            {bet.status === 'PENDING' && (
                                <>
                                    <button onClick={() => handleStatusChange(bet, 'WIN')} className="p-2 rounded bg-success-500/10 text-success-400 hover:bg-success-500 hover:text-white transition-colors"><span className="material-symbols-outlined">check</span></button>
                                    <button onClick={() => handleStatusChange(bet, 'LOSS')} className="p-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                                    <button onClick={() => handleCashout(bet)} className="p-2 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"><span className="material-symbols-outlined">attach_money</span></button>
                                    <button onClick={() => onEdit(bet)} className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white"><span className="material-symbols-outlined">edit</span></button>
                                </>
                            )}
                            <button onClick={() => { if(confirm('Excluir aposta?')) onDelete(bet.id); }} className="p-2 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"><span className="material-symbols-outlined">delete</span></button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};

const BettorsPage = ({ bettors, onAdd, onDelete, onToggleStatus, isAdmin }: { bettors: Bettor[], onAdd: (n: string, a: string) => void, onDelete: (id: number) => void, onToggleStatus: (id: number) => void, isAdmin: boolean }) => {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = () => {
        if (!name) return;
        onAdd(name, avatar);
        setName('');
        setAvatar('');
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white">Apostadores</h2>
                {isAdmin && <button onClick={() => setIsAdding(!isAdding)} className="bg-brand-500 text-white px-4 py-2 rounded-lg font-bold">Novo Apostador</button>}
            </div>
            {isAdding && (
                <div className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-gray-400">Nome</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white" /></div>
                    <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-gray-400">Avatar URL (Opcional)</label><input value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white" /></div>
                    <button onClick={handleAdd} className="bg-success-500 text-white px-6 py-2 rounded-lg font-bold h-10 w-full md:w-auto">Salvar</button>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bettors.map(b => (
                    <div key={b.id} className={`bg-dark-800 border ${b.status === 'Ativo' ? 'border-white/5' : 'border-red-900/30 opacity-60'} rounded-xl p-6 flex flex-col items-center gap-4 relative group`}>
                        <Avatar url={b.avatar} name={b.name} size="lg" />
                        <div className="text-center"><h3 className="text-white font-bold text-lg">{b.name}</h3><p className="text-xs text-gray-500">Desde {b.date}</p></div>
                        {isAdmin && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onToggleStatus(b.id)} className="p-1.5 rounded-lg bg-dark-900 text-gray-400 hover:text-white border border-white/10"><span className="material-symbols-outlined text-sm">{b.status === 'Ativo' ? 'block' : 'check_circle'}</span></button>
                                <button onClick={() => { if(confirm('Excluir?')) onDelete(b.id); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"><span className="material-symbols-outlined text-sm">delete</span></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsPage = ({ bets, bettors }: { bets: Bet[], bettors: Bettor[] }) => {
    const data = useMemo(() => {
        const stats = bettors.map(b => {
            const userBets = bets.filter(bet => bet.bettor === b.name);
            const profit = userBets.reduce((acc, bet) => {
                if(bet.status === 'WIN') return acc + (bet.potentialProfit || 0);
                if(bet.status === 'LOSS') return acc - (bet.stake || 0);
                return acc;
            }, 0);
            return { name: b.name, profit };
        });
        return stats.filter(s => s.profit !== 0).sort((a,b) => b.profit - a.profit);
    }, [bets, bettors]);

    return (
        <div className="flex flex-col gap-6 h-full">
            <h2 className="text-3xl font-black text-white">Relatórios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                 <div className="bg-dark-800 p-6 rounded-xl border border-white/5 flex flex-col">
                    <h3 className="text-white font-bold mb-4">Lucro por Apostador</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                            <XAxis type="number" stroke="#94a3b8" />
                            <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} cursor={{fill: 'transparent'}} formatter={(val: number) => [`R$ ${val.toFixed(2)}`, 'Lucro']} />
                            <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4ade80' : '#f87171'} />)}
                                <LabelList dataKey="profit" position="right" fill="#fff" formatter={(val: number) => `R$ ${val.toFixed(0)}`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};

const AccessPage = ({ users, onAddUser, onDeleteUser }: { users: User[], onAddUser: (u: User) => void, onDeleteUser: (id: number) => void }) => {
    const [newUser, setNewUser] = useState<Partial<User>>({ role: 'viewer', status: 'Ativo' });

    const handleAdd = () => {
        if (!newUser.username || !newUser.password || !newUser.name) return alert('Preencha os campos obrigatórios');
        onAddUser({
            id: Date.now(),
            username: newUser.username,
            password: newUser.password,
            name: newUser.name,
            email: newUser.email || '',
            role: newUser.role as any,
            status: newUser.status || 'Ativo',
            avatar: newUser.avatar
        });
        setNewUser({ role: 'viewer', status: 'Ativo' });
    };

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-black text-white">Controle de Acesso</h2>
            <div className="bg-dark-800 p-6 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Nome</label><input value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white" placeholder="Nome Completo" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Usuário</label><input value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white" placeholder="Login" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Senha</label><input type="password" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white" placeholder="******" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Função</label><select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-white"><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Visualizador</option></select></div>
                <button onClick={handleAdd} className="bg-brand-500 text-white font-bold py-2 px-4 rounded-lg md:col-span-4 mt-2 hover:bg-brand-400 transition-colors">Adicionar Usuário</button>
            </div>
            <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-dark-800 text-xs uppercase font-bold text-gray-200"><tr><th className="p-4">Usuário</th><th className="p-4">Login</th><th className="p-4">Função</th><th className="p-4 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-white/5 bg-dark-900">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-white/5">
                                <td className="p-4 flex items-center gap-3"><Avatar name={u.name} size="sm" /><span className="text-white font-medium">{u.name}</span></td>
                                <td className="p-4 font-mono">{u.username}</td>
                                <td className="p-4"><span className="bg-white/10 px-2 py-1 rounded text-xs text-white capitalize">{u.role}</span></td>
                                <td className="p-4 text-right">{u.username !== 'admin' && <button onClick={() => { if(confirm('Remover usuário?')) onDeleteUser(u.id); }} className="text-red-400 hover:text-red-300"><span className="material-symbols-outlined text-lg">delete</span></button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- App ---

const App = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [page, setPage] = useState<PageType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
  const [bettors, setBettors] = useState<Bettor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editingBet, setEditingBet] = useState<Bet | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [betsData, bettorsData, usersData] = await Promise.all([
          fetch(`${API_URL}?action=getBets`).then(res => res.json()),
          fetch(`${API_URL}?action=getBettors`).then(res => res.json()),
          fetch(`${API_URL}?action=getUsers`).then(res => res.json())
        ]);

        if(Array.isArray(betsData)) {
            const normalizedBets = betsData.map((b: any) => ({
                id: b.id || b.ID,
                date: b.date || b.Date,
                bettor: b.bettor || b.Bettor,
                type: b.type || b.Type,
                selections: Array.isArray(b.selections) ? b.selections : (Array.isArray(b.Selections) ? b.Selections : []), 
                stake: Number(b.stake || b.Stake),
                totalOdds: Number(b.totalOdds || b.TotalOdds),
                potentialProfit: Number(b.potentialProfit || b.PotentialProfit || b.totalOdds),
                status: b.status || b.Status || b.PotentialProfit,
                isCashout: b.isCashout || b.IsCashout || b.Status
            }));
            setBets(normalizedBets.sort((a:Bet, b:Bet) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        if(Array.isArray(bettorsData)) {
            const normalizedBettors = bettorsData.map((b: any) => ({
                id: b.id || b.ID,
                name: b.name || b.Name,
                date: b.date || b.Date,
                status: b.status || b.Status,
                avatar: b.avatar || b.Avatar
            }));
            setBettors(normalizedBettors);
        }

        if(Array.isArray(usersData)) {
            const normalizedUsers = usersData.map((u: any) => ({
                id: u.id || u.ID,
                username: u.username || u.Username,
                password: String(u.password || u.Password),
                name: u.name || u.Name,
                email: u.email || u.Email,
                role: (u.role || u.Role)?.toLowerCase(), 
                status: u.status || u.Status,
                avatar: u.avatar || u.Avatar
            }));
            setUsers(normalizedUsers);
        }

      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = (session: UserSession) => { setUser(session); setPage('dashboard'); };
  const handleLogout = () => { setUser(null); setPage('dashboard'); };

  const handleSaveBet = async (bet: Bet) => {
    const isEditing = bets.some(b => b.id === bet.id);
    if (isEditing) {
        setBets(bets.map(b => b.id === bet.id ? bet : b));
        setPage('ledger');
        await apiPost({ action: 'editBet', payload: bet });
    } else {
        setBets([bet, ...bets]);
        setPage('ledger');
        await apiPost({ action: 'addBet', payload: bet });
    }
  };

  const handleDeleteBet = async (id: number) => {
      setBets(currentBets => currentBets.filter(b => b.id !== id));
      await apiPost({ action: 'deleteBet', id: String(id) });
  };

  const handleAddBettor = async (name: string, avatar: string) => {
    const newBettor: Bettor = { id: Date.now(), name, date: new Date().toLocaleDateString(), status: 'Ativo', avatar };
    setBettors([...bettors, newBettor]);
    await apiPost({ action: 'addBettor', payload: newBettor });
  };

  const handleDeleteBettor = async (id: number) => {
      setBettors(bettors.filter(b => b.id !== id));
      await apiPost({ action: 'deleteBettor', id });
  };
  
  const handleToggleBettorStatus = async (id: number) => {
      const bettor = bettors.find(b => b.id === id);
      if(bettor) {
          const newStatus = bettor.status === 'Ativo' ? 'Inativo' : 'Ativo';
          setBettors(bettors.map(b => b.id === id ? { ...b, status: newStatus } : b));
          await apiPost({ action: 'updateBettorStatus', id, status: newStatus });
      }
  };

  const handleUpdateStatus = async (id: number, status: BetStatus, newProfit?: number, isCashout: boolean = false) => {
      setBets(bets.map(b => {
          if (b.id !== id) return b;
          const updated = { ...b, status, isCashout };
          if (newProfit !== undefined) updated.potentialProfit = newProfit;
          return updated;
      }));
      await apiPost({ action: 'updateBetStatus', id, status, profit: newProfit, isCashout });
  };

  const handleAddUser = async (user: User) => {
      setUsers([...users, user]);
      await apiPost({ action: 'addUser', payload: user });
  };

  const handleDeleteUser = async (id: number) => {
      setUsers(users.filter(u => u.id !== id));
      await apiPost({ action: 'deleteUser', id });
  };

  if (loading) {
     return (
        <div className="h-screen w-screen bg-dark-950 flex flex-col items-center justify-center text-white gap-4">
             <div className="size-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="font-bold text-lg animate-pulse">Carregando dados da banca...</p>
        </div>
     )
  }

  if (!user) return <LoginPage onLogin={handleLogin} users={users} isLoading={loading} />;

  return (
    <div className="flex h-screen bg-dark-950 font-sans overflow-hidden">
      <Sidebar activePage={page} setPage={setPage} user={user} onLogout={handleLogout} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="md:hidden flex items-center justify-between mb-6">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-white bg-dark-800 rounded-lg border border-white/10"><span className="material-symbols-outlined">menu</span></button>
             <span className="font-bold text-white">BetManager</span>
             <div className="w-10"></div>
          </div>
          {page === 'dashboard' && <DashboardPage bets={bets} onNewBet={() => { setEditingBet(null); setPage('new-bet'); }} isAdmin={user.role === 'admin'} />}
          {page === 'new-bet' && <NewBetPage onSave={handleSaveBet} onCancel={() => setPage('dashboard')} editBet={editingBet} bettors={bettors} />}
          {page === 'ranking' && <RankingPage bets={bets} bettors={bettors} />}
          {page === 'ledger' && <LedgerPage bets={bets} onEdit={(b: Bet) => { setEditingBet(b); setPage('new-bet'); }} onDelete={handleDeleteBet} onUpdateStatus={handleUpdateStatus} onNewBet={() => { setEditingBet(null); setPage('new-bet'); }} isAdmin={user.role === 'admin'} />}
          {page === 'bettors' && <BettorsPage bettors={bettors} onAdd={handleAddBettor} onDelete={handleDeleteBettor} onToggleStatus={handleToggleBettorStatus} isAdmin={user.role === 'admin'} />}
          {page === 'reports' && <ReportsPage bettors={bettors} bets={bets} />}
          {page === 'access' && <AccessPage users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} />}
        </div>
      </main>
    </div>
  );
};

export default App;