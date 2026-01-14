import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList, Tooltip
} from 'recharts';

// --- CONFIGURATION ---
const HARDCODED_URL = 'https://script.google.com/macros/s/AKfycbxCKCU0IvpMKOD_5R574da4pQSDzwJiNC6W9ZDo9Yo63mWqFsAmiSkdMQXhh9t5Q3Df/exec'; 

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

const formatDatePretty = (dateString: string) => {
    if (!dateString) return '-';
    try {
        const cleanDate = dateString.split('T')[0];
        const [year, month, day] = cleanDate.split('-').map(Number);
        
        if (!year || !month || !day) return dateString;
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch (e) {
        return dateString;
    }
};

const normalizeStatus = (status: any): BetStatus => {
    if (!status) return 'PENDING';
    const s = String(status).toLowerCase().trim();
    if (['win', 'won', 'vitoria', 'vitória', 'ganha', 'green'].includes(s)) return 'WIN';
    if (['loss', 'lost', 'derrota', 'perda', 'red'].includes(s)) return 'LOSS';
    return 'PENDING';
};

const filterBetsByPeriod = (bets: Bet[], period: string, refDate: Date = new Date()) => {
  return bets.filter(bet => {
    if (!bet.date) return false;
    const betDateStr = bet.date.split('T')[0];
    
    switch (period) {
      case 'Hoje': 
         const now = new Date();
         const todayStr = now.toISOString().split('T')[0];
         return betDateStr === todayStr;
      case 'Semana':
          const n = new Date();
          const d = new Date(betDateStr + 'T12:00:00');
          const day = n.getDay();
          const diff = n.getDate() - day + (day === 0 ? -6 : 1); 
          const monday = new Date(n.setDate(diff));
          monday.setHours(0,0,0,0);
          return d >= monday;
      case 'Mês':
        const betDate = new Date(betDateStr + 'T12:00:00'); 
        return betDate.getMonth() === refDate.getMonth() && betDate.getFullYear() === refDate.getFullYear();
      case 'Ano':
        const betDateY = new Date(betDateStr + 'T12:00:00'); 
        return betDateY.getFullYear() === refDate.getFullYear();
      case 'Total': return true;
      case 'Geral': return true;
      default: return true;
    }
  });
};

const Avatar = ({ url, name, size = 'md', className = '' }: { url?: string, name: string, size?: 'sm'|'md'|'lg'|'xl'|'2xl'|'xs', className?: string }) => {
    const sizeClasses = { xs: 'size-5 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-24 text-3xl', '2xl': 'size-32 text-4xl' };
    if (url && url.length > 5) {
        return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-dark-800 ${className}`} />;
    }
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-dark-700 flex items-center justify-center font-bold text-gray-300 uppercase border-2 border-dark-800 ${className}`}>
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

const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value, formatter } = props;
  const isNegative = value < 0;
  const verticalPos = isNegative ? y + height + 12 : y - 5;
  const formattedValue = formatter ? formatter(value) : value;

  return (
    <text x={x + width / 2} y={verticalPos} fill="#fff" textAnchor="middle" fontSize={10} fontWeight="bold" dominantBaseline={isNegative ? "hanging" : "auto"}>
      {formattedValue}
    </text>
  );
};

const DateFilterControls = ({ filter, date, setDate }: { filter: string, date: Date, setDate: (d: Date) => void }) => {
    if (filter !== 'Mês' && filter !== 'Ano') return null;

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 6}, (_, i) => currentYear - 4 + i);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDate = new Date(date);
        newDate.setMonth(parseInt(e.target.value));
        setDate(newDate);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDate = new Date(date);
        newDate.setFullYear(parseInt(e.target.value));
        setDate(newDate);
    };

    return (
        <div className="flex gap-2 animate-fadeIn">
            {filter === 'Mês' && (
                <select value={date.getMonth()} onChange={handleMonthChange} className="bg-dark-800 border border-white/5 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none">
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
            )}
            <select value={date.getFullYear()} onChange={handleYearChange} className="bg-dark-800 border border-white/5 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
    );
};

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

const Sidebar = ({ activePage, onNavigate, user, onLogout, isOpen, onClose }: any) => {
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
                <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${activePage === item.id ? 'bg-brand-500/10 text-brand-400' : 'text-gray-400 hover:text-white'}`}>
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
  const [chartMetric, setChartMetric] = useState<'profit' | 'units'>('units'); 

  // Strict Calculation: 
  // WIN = potentialProfit (which is (stake*odds)-stake)
  // LOSS = -stake (negative stake)
  const totalBankroll = useMemo(() => bets.reduce((acc, bet) => acc + (Number(bet.stake)||0), 0), [bets]);
  
  // Updated totalProfit to use .toFixed(2) to match Ranking sum exactly (avoiding floating point errors)
  const totalProfit = useMemo(() => {
      const sum = bets.reduce((acc, bet) => {
        if (bet.status === 'WIN') return acc + (Number(bet.potentialProfit)||0);
        if (bet.status === 'LOSS') return acc - (Number(bet.stake)||0);
        return acc;
      }, 0);
      return Number(sum.toFixed(2));
  }, [bets]);

  const totalUnits = useMemo(() => {
      const sum = bets.reduce((acc, bet) => {
        const s = Number(bet.stake);
        if (s === 0) return acc;
        if (bet.status === 'WIN') return acc + ((Number(bet.potentialProfit) / s) || 0);
        if (bet.status === 'LOSS') return acc - 1;
        return acc;
      }, 0);
      return sum; // No need to clamp here usually, but can be done if needed
  }, [bets]);
  
  const chartData = useMemo(() => {
     if (bets.length === 0) return performanceData;
     
     const grouped = bets.reduce((acc: any, bet) => {
         const d = bet.date.split('T')[0];
         if (!acc[d]) acc[d] = { profit: 0, units: 0 };
         
         const s = Number(bet.stake) || 0;

         if (bet.status === 'WIN') {
            acc[d].profit += Number(bet.potentialProfit) || 0;
            if(s > 0) acc[d].units += (Number(bet.potentialProfit) / s);
         }
         if (bet.status === 'LOSS') {
            acc[d].profit -= s;
            acc[d].units -= 1;
         }
         return acc;
     }, {});

     let runningProfit = 0;
     let runningUnits = 0;

     return Object.keys(grouped).sort().map(date => {
         runningProfit += grouped[date].profit;
         runningUnits += grouped[date].units;
         
         // Format date to DD/MM/YY
         const [year, month, day] = date.split('-');
         const formattedDate = `${day}/${month}/${year.slice(2)}`;

         return { 
             name: formattedDate,
             profit: Number(runningProfit.toFixed(2)), 
             units: Number(runningUnits.toFixed(2))
         };
     });
  }, [bets]);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div><h2 className="text-3xl font-black text-white">Visão Geral</h2><p className="text-gray-400">Resumo de desempenho.</p></div>
        {isAdmin && <button onClick={onNewBet} className="flex gap-2 items-center rounded-lg h-10 px-5 bg-brand-500 text-white font-bold w-full md:w-auto justify-center"><span className="material-symbols-outlined">add</span> Nova Aposta</button>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-6 bg-dark-800 border border-white/5">
            <p className="text-gray-400 text-sm font-medium uppercase">Valor Investido</p>
            <p className="text-3xl font-bold mt-2 text-white">{formatCurrency(totalBankroll)}</p>
        </div>
        <div className="rounded-xl p-6 bg-dark-800 border border-white/5">
            <p className="text-gray-400 text-sm font-medium uppercase">Lucro (Unidades)</p>
            <p className={`text-3xl font-bold mt-2 ${totalUnits >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{totalUnits > 0 ? '+' : ''}{totalUnits.toFixed(2)}u</p>
        </div>
        <div className="rounded-xl p-6 bg-dark-800 border border-white/5">
            <p className="text-gray-400 text-sm font-medium uppercase">Lucro (R$)</p>
            <p className={`text-3xl font-bold mt-2 ${totalProfit >= 0 ? 'text-success-400' : 'text-red-400'}`}>{formatCurrency(totalProfit)}</p>
        </div>
        <div className="rounded-xl p-6 bg-dark-800 border border-white/5">
            <p className="text-gray-400 text-sm font-medium uppercase">Apostas</p>
            <div className="flex items-center gap-4 mt-2">
                <div>
                    <p className="text-2xl font-bold text-success-400">{bets.filter(b => b.status === 'WIN').length}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Ganhas</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div>
                    <p className="text-2xl font-bold text-red-400">{bets.filter(b => b.status === 'LOSS').length}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Perdidas</p>
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-white/5 bg-dark-800 h-[400px] p-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg font-bold">Evolução de Ganhos</h3>
            <div className="flex bg-dark-900 p-1 rounded-lg border border-white/10">
                <button onClick={() => setChartMetric('units')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${chartMetric === 'units' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}>Unidades</button>
                <button onClick={() => setChartMetric('profit')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${chartMetric === 'profit' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}>R$</button>
            </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} 
                formatter={(value: number) => [chartMetric === 'profit' ? formatCurrency(value) : `${value}u`, chartMetric === 'profit' ? 'Lucro' : 'Unidades']}
            />
            <Area 
                type="monotone" 
                dataKey={chartMetric} 
                stroke="#06b6d4" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
            >
                <LabelList 
                    dataKey={chartMetric} 
                    position="top" 
                    offset={10} 
                    fill="#cbd5e1" 
                    fontSize={10} 
                    formatter={(val: number) => chartMetric === 'profit' ? `R$${val.toFixed(0)}` : `${val}u`}
                />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const NewBetPage = ({ onSave, onCancel, editBet, bettors }: { onSave: (bet: Bet) => void, onCancel: () => void, editBet: Bet | null, bettors: Bettor[] }) => {
  const [bettor, setBettor] = useState(editBet?.bettor || '');
  const [date, setDate] = useState(editBet?.date || new Date().toISOString().split('T')[0]);
  const [stake, setStake] = useState<string>(editBet?.stake.toString() || '100.00'); // Default to 100
  const [selections, setSelections] = useState<Selection[]>(editBet?.selections || [{ id: Date.now().toString(), event: '', pick: '', odds: 1.0 }]);

  const updateSelection = (id: string, field: keyof Selection, value: string | number) => {
    setSelections(selections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalOdds = selections.reduce((acc, curr) => acc * (curr.odds || 1), 1);
  const numericStake = parseFloat(stake) || 0;
  const potentialProfit = (numericStake * totalOdds) - numericStake;

  const handleSave = () => {
    if (!bettor || numericStake <= 0 || !date) return alert("Preencha os campos obrigatórios.");
    onSave({
      id: editBet?.id || Date.now(),
      date: date,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-bold">Apostador</label>
                <select value={bettor} onChange={(e) => setBettor(e.target.value)} className="h-12 rounded-lg bg-dark-900 border border-white/5 text-white px-4 outline-none focus:border-brand-500">
                    <option value="">Selecione...</option>
                    {bettors.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-bold">Data da Aposta</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="h-12 rounded-lg bg-dark-900 border border-white/5 text-white px-4 outline-none focus:border-brand-500 [color-scheme:dark]"
                />
            </div>
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
  const [viewMode, setViewMode] = useState<'profit' | 'units'>('units'); // Default to units
  const [filter, setFilter] = useState('Total');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const ranking = useMemo(() => {
    const filteredBets = filterBetsByPeriod(bets, filter, selectedDate);
    
    const stats: Record<string, { name: string, profit: number, bets: number, wins: number, units: number, roi: number, avatar?: string, streak: number }> = {};
    
    // Initialize
    bettors.forEach(b => { 
        stats[b.name] = { name: b.name, profit: 0, bets: 0, wins: 0, units: 0, roi: 0, avatar: b.avatar, streak: 0 }; 
    });

    // Calc basic stats
    filteredBets.forEach(bet => {
      if (!stats[bet.bettor]) return; // Should not happen
      
      if (bet.status !== 'PENDING') {
         stats[bet.bettor].bets += 1;
         const s = Number(bet.stake) || 0;

         if (bet.status === 'WIN') {
            stats[bet.bettor].wins += 1;
            stats[bet.bettor].profit += (Number(bet.potentialProfit) || 0);
            if(s > 0) stats[bet.bettor].units += (Number(bet.potentialProfit) / s);
         } else if (bet.status === 'LOSS') {
            stats[bet.bettor].profit -= s;
            stats[bet.bettor].units -= 1;
         }
      }
    });

    // Calculate ROI and final clean up
    let totalStakeMap: Record<string, number> = {};
    filteredBets.forEach(bet => {
        if(bet.status !== 'PENDING') {
            totalStakeMap[bet.bettor] = (totalStakeMap[bet.bettor] || 0) + Number(bet.stake);
        }
    });

    // Calculate Streak (Simplified: current streak from latest bets)
    // We need bets sorted by date desc for this
    const betsByBettor: Record<string, Bet[]> = {};
    filteredBets.forEach(b => {
        if(!betsByBettor[b.bettor]) betsByBettor[b.bettor] = [];
        betsByBettor[b.bettor].push(b);
    });

    Object.keys(stats).forEach(key => {
        const s = stats[key];
        const totalStake = totalStakeMap[key] || 0;
        s.roi = totalStake > 0 ? (s.profit / totalStake) * 100 : 0;
        
        // Streak logic
        const userBets = betsByBettor[key] || [];
        // Assuming bets is already sorted by date desc from App component
        let streak = 0;
        for (let bet of userBets) {
           if (bet.status === 'WIN') streak++;
           else if (bet.status === 'LOSS') break;
        }
        s.streak = streak;
    });
    
    const sorted = Object.values(stats).sort((a, b) => {
        if (viewMode === 'profit') return b.profit - a.profit;
        return b.units - a.units;
    });

    return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [bets, bettors, viewMode, filter, selectedDate]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3); 

  // Helper to reorder top3 for podium: 2nd, 1st, 3rd
  const podiumOrder = [
      top3.find(r => r.rank === 2),
      top3.find(r => r.rank === 1),
      top3.find(r => r.rank === 3)
  ].filter(Boolean);

  return (
     <div className="flex flex-col gap-8 max-w-[1000px] mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
                <h2 className="text-3xl font-black text-white">Ranking de Performance</h2>
                <p className="text-gray-400 text-sm mt-1">Acompanhe quem está liderando os lucros no grupo. 🏆</p>
             </div>
             
             <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-2">
                     <DateFilterControls filter={filter} date={selectedDate} setDate={setSelectedDate} />
                     <div className="flex bg-dark-800 p-1 rounded-lg border border-white/5">
                         {['Semana', 'Mês', 'Ano', 'Total'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>{f}</button>
                         ))}
                     </div>
                 </div>
                 <div className="flex bg-dark-800 p-1 rounded-lg border border-white/5">
                     <button onClick={() => setViewMode('units')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'units' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Unidades</button>
                     <button onClick={() => setViewMode('profit')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'profit' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>R$</button>
                 </div>
             </div>
        </div>
        
        {/* Podium */}
        {ranking.length > 0 && (
            <div className="flex justify-center items-end gap-4 md:gap-8 py-8 min-h-[300px]">
                {podiumOrder.map((r: any) => (
                    <div key={r.name} className={`flex flex-col items-center relative ${r.rank === 1 ? 'order-2 -mt-10' : r.rank === 2 ? 'order-1' : 'order-3'}`}>
                        {r.rank === 1 && <span className="material-symbols-outlined text-yellow-400 text-4xl mb-2 animate-bounce">emoji_events</span>}
                        
                        <div className={`relative rounded-full p-1 ${
                            r.rank === 1 ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_0_30px_rgba(234,179,8,0.4)]' : 
                            r.rank === 2 ? 'bg-gradient-to-b from-gray-300 to-gray-500 shadow-[0_0_20px_rgba(209,213,219,0.2)]' : 
                            'bg-gradient-to-b from-orange-400 to-orange-700 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        }`}>
                            <Avatar url={r.avatar} name={r.name} size={r.rank === 1 ? 'xl' : 'lg'} className="border-4 border-dark-950" />
                            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border-2 border-dark-950 ${
                                r.rank === 1 ? 'bg-yellow-400 text-yellow-950' : r.rank === 2 ? 'bg-gray-300 text-gray-900' : 'bg-orange-500 text-white'
                            }`}>
                                {r.rank}º Lugar
                            </div>
                        </div>

                        <div className="text-center mt-6">
                            <h3 className={`font-bold text-lg ${r.rank === 1 ? 'text-yellow-400' : 'text-white'}`}>{r.name}</h3>
                            <p className="font-black text-xl text-white">
                                {viewMode === 'profit' ? formatCurrency(r.profit) : `${r.units.toFixed(2)}u`}
                            </p>
                            <p className={`text-xs font-bold ${r.roi >= 0 ? 'text-success-400' : 'text-red-400'}`}>
                                {r.roi > 0 ? '+' : ''}{r.roi.toFixed(1)}% ROI
                            </p>
                            <div className="flex items-center justify-center gap-3 mt-2 opacity-80">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-500">Win Rate</span>
                                    <span className="text-xs font-bold text-blue-400">
                                        {r.bets > 0 ? ((r.wins / r.bets) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                                <div className="w-px h-6 bg-white/10"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-500">Seq.</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-orange-400">{r.streak}</span>
                                        <span className="material-symbols-outlined text-orange-500 text-[10px]">local_fire_department</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Detailed Table */}
        <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-dark-900/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1 text-center">Posição</div>
                <div className="col-span-4 md:col-span-3">Apostador</div>
                <div className="col-span-3 md:col-span-3">{viewMode === 'profit' ? 'Lucro Total' : 'Unidades'}</div>
                <div className="col-span-2 hidden md:block text-center">ROI</div>
                <div className="col-span-2 hidden md:block text-center">Taxa de Acerto</div>
                <div className="col-span-2 md:col-span-1 text-right">Seq.</div>
            </div>
            
            <div className="divide-y divide-white/5">
                {rest.map((r: any) => (
                    <div key={r.name} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-1 flex justify-center">
                            <div className={`size-8 flex items-center justify-center rounded-full font-bold text-sm ${
                                r.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 
                                r.rank === 2 ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50' : 
                                r.rank === 3 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/50' : 
                                'text-gray-500'
                            }`}>
                                {r.rank}
                            </div>
                        </div>
                        <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                            <Avatar url={r.avatar} name={r.name} size="sm" />
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-sm">{r.name}</span>
                                <span className="text-[10px] text-gray-500">{r.bets} bets</span>
                            </div>
                        </div>
                        <div className="col-span-3 md:col-span-3">
                            {viewMode === 'profit' ? (
                                <span className={`font-black text-sm ${r.profit >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(r.profit)}</span>
                            ) : (
                                <span className={`font-black text-sm ${r.units >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{r.units > 0 ? '+' : ''}{r.units.toFixed(2)}u</span>
                            )}
                            {viewMode === 'profit' && <div className={`h-1 rounded-full mt-1 w-24 ${r.profit >= 0 ? 'bg-brand-500' : 'bg-red-500'}`} style={{ width: Math.min(Math.abs(r.profit)/50, 100) + '%' }}></div>}
                        </div>
                        <div className="col-span-2 hidden md:flex justify-center">
                             <span className={`text-xs font-bold px-2 py-1 rounded ${r.roi >= 0 ? 'bg-success-500/10 text-success-400' : 'bg-red-500/10 text-red-400'}`}>{r.roi > 0 ? '+' : ''}{r.roi.toFixed(1)}%</span>
                        </div>
                        <div className="col-span-2 hidden md:flex flex-col gap-1 justify-center">
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>{r.bets > 0 ? ((r.wins / r.bets) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-dark-950 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${r.bets > 0 ? ((r.wins / r.bets) * 100) : 0}%` }}></div>
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-end items-center gap-1">
                            <span className="font-mono font-bold text-orange-400">{r.streak}</span>
                            <span className="material-symbols-outlined text-orange-500 text-sm">local_fire_department</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
     </div>
  );
};

const LedgerPage = ({ bets, onEdit, onDelete, onUpdateStatus, isAdmin }: { bets: Bet[], onEdit: (b:Bet)=>void, onDelete: (id:number)=>void, onUpdateStatus: (id:number, s:BetStatus, p?:number, c?:boolean)=>void, isAdmin: boolean }) => {
  const [filter, setFilter] = useState('Geral');
  const [viewMode, setViewMode] = useState<'profit' | 'units'>('units'); // Default to units
  const [selectedBettor, setSelectedBettor] = useState('Todos');

  const uniqueBettors = useMemo(() => {
     const names = new Set(bets.map(b => b.bettor));
     return ['Todos', ...Array.from(names).sort()];
  }, [bets]);

  const filteredBets = useMemo(() => {
     let res = filterBetsByPeriod(bets, filter);
     if (selectedBettor !== 'Todos') {
         res = res.filter(b => b.bettor === selectedBettor);
     }
     return res;
  }, [bets, filter, selectedBettor]);

  const toggleStatus = (bet: Bet) => {
      if (!isAdmin) return;
      
      let nextStatus: BetStatus = 'PENDING';
      let profit = 0;
      
      // Always recalculate standard profit to ensure we don't carry over 0 from LOSS state
      const standardProfit = (Number(bet.stake) * Number(bet.totalOdds)) - Number(bet.stake);

      if (bet.status === 'PENDING') {
          nextStatus = 'WIN';
          profit = standardProfit;
      } else if (bet.status === 'WIN') {
          nextStatus = 'LOSS';
          profit = 0;
      } else {
          // LOSS -> PENDING
          nextStatus = 'PENDING';
          // Restore standard potential profit for PENDING display
          profit = standardProfit;
      }
      
      // When toggling status via badge, we assume standard win/loss, not cashout
      onUpdateStatus(bet.id, nextStatus, profit, false);
  };
  
  const handleCashout = (bet: Bet) => {
      const val = prompt('Informe o LUCRO obtido no Cashout (Ex: 10.50):', '0.00');
      if (val !== null) {
          const profit = parseFloat(val.replace(',', '.')); 
          if (isNaN(profit)) return alert('Valor inválido');
          onUpdateStatus(bet.id, 'WIN', profit, true);
      }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-black text-white">Histórico</h2>
            
            <div className="flex flex-wrap gap-2">
                 <div className="flex bg-dark-800 p-1 rounded-lg border border-white/5">
                     <button onClick={() => setViewMode('units')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'units' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>u</button>
                     <button onClick={() => setViewMode('profit')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'profit' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>R$</button>
                 </div>

                 <div className="flex bg-dark-800 p-1 rounded-lg border border-white/5">
                    <select 
                        value={selectedBettor} 
                        onChange={(e) => setSelectedBettor(e.target.value)}
                        className="bg-transparent text-white text-xs font-bold px-2 py-1 outline-none cursor-pointer"
                    >
                        {uniqueBettors.map(b => (
                            <option key={b} value={b} className="bg-dark-800 text-white">{b}</option>
                        ))}
                    </select>
                 </div>

                <div className="flex gap-2 bg-dark-800 p-1 rounded-lg border border-white/5">
                    {['Geral', 'Hoje', 'Mês'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>{f}</button>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="flex flex-col gap-3">
            {filteredBets.length === 0 && <p className="text-center text-gray-500 py-10">Nenhuma aposta encontrada.</p>}
            {filteredBets.map(bet => {
                const isWin = bet.status === 'WIN';
                const isLoss = bet.status === 'LOSS';
                const profitValue = isWin ? bet.potentialProfit : (isLoss ? -bet.stake : 0);
                const profitColor = isWin ? 'text-success-400' : (isLoss ? 'text-red-400' : 'text-gray-500');
                const unitValue = bet.stake > 0 ? (profitValue / bet.stake) : 0;

                return (
                 <div key={bet.id} className="bg-dark-800 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center relative overflow-hidden">
                    {/* Decorative side bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${isWin ? 'bg-success-500' : isLoss ? 'bg-red-500' : 'bg-gray-600'}`}></div>
                    
                    {/* Left Section: Status & Info */}
                    <div className="flex flex-col gap-2 flex-1 min-w-[200px] pl-4">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => toggleStatus(bet)}
                                disabled={!isAdmin}
                                className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border transition-all ${
                                    isWin ? 'bg-success-500/10 text-success-400 border-success-500/20 hover:bg-success-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]' :
                                    isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.2)]' :
                                    'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
                                } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {bet.isCashout ? 'CASHOUT' : (isWin ? 'VITÓRIA' : (isLoss ? 'DERROTA' : 'PENDENTE'))}
                            </button>
                            <span className="text-xs text-gray-500 font-bold">{formatDatePretty(bet.date)}</span>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                 <Avatar name={bet.bettor} size="xs" className="size-5 text-[10px]" />
                                 <span className="text-white font-bold text-lg">{bet.bettor}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                                 {bet.selections.map((s, i) => (
                                     <span key={i} className="block">
                                         <span className="text-gray-500">{s.event}:</span> {s.pick} <span className="text-brand-500 font-bold">@{s.odds}</span>
                                     </span>
                                 ))}
                            </div>
                        </div>
                    </div>

                    {/* Middle Section: Stake / Profit */}
                    <div className="flex flex-col items-end md:items-center px-4 md:border-l md:border-r border-white/5 h-full justify-center min-w-[180px]">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{viewMode === 'profit' ? 'Stake / Lucro ou Prejuízo' : 'Stake / Unidades'}</p>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 font-medium text-sm">{formatCurrency(bet.stake)}</span>
                            <span className={`font-black text-lg ${profitColor}`}>
                                {viewMode === 'profit' 
                                    ? ((profitValue > 0 ? '+' : '') + formatCurrency(profitValue))
                                    : ((unitValue > 0 ? '+' : '') + unitValue.toFixed(2) + 'u')
                                }
                            </span>
                        </div>
                    </div>

                    {/* Right Section: Actions */}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleCashout(bet)} title="Cashout / Editar Lucro" className="size-9 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-lg">attach_money</span>
                            </button>
                            <button onClick={() => onEdit(bet)} title="Editar" className="size-9 rounded bg-dark-700 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => { if(confirm('Excluir?')) onDelete(bet.id); }} title="Excluir" className="size-9 rounded bg-dark-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-white/5 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                    )}
                 </div>
               );
            })}
        </div>
    </div>
  );
};

const ReportsPage = ({ bets, bettors }: { bets: Bet[], bettors: Bettor[] }) => {
    const [filter, setFilter] = useState('Geral');
    const [metric, setMetric] = useState<'profit' | 'units'>('units'); // Default to units
    const [selectedDate, setSelectedDate] = useState(new Date());

    const filteredBets = useMemo(() => filterBetsByPeriod(bets, filter, selectedDate), [bets, filter, selectedDate]);

    const data = useMemo(() => {
        const stats = bettors.map(b => {
            const userBets = filteredBets.filter(bet => bet.bettor === b.name);
            const profit = userBets.reduce((acc, bet) => {
                if(bet.status === 'WIN') return acc + (Number(bet.potentialProfit) || 0);
                if(bet.status === 'LOSS') return acc - (Number(bet.stake) || 0);
                return acc;
            }, 0);
            
            const units = userBets.reduce((acc, bet) => {
                if(bet.status === 'WIN') return acc + ((Number(bet.potentialProfit) / Number(bet.stake)) || 0);
                if(bet.status === 'LOSS') return acc - 1;
                return acc;
            }, 0);

            const wins = userBets.filter(bet => bet.status === 'WIN').length;
            const settled = userBets.filter(bet => bet.status === 'WIN' || bet.status === 'LOSS').length;
            const winRate = settled > 0 ? (wins / settled) * 100 : 0;
            
            return { name: b.name, profit, units, wins, winRate, settled };
        });
        
        return stats.filter(s => (metric === 'profit' ? s.profit !== 0 : s.units !== 0) || s.settled > 0)
                    .sort((a,b) => metric === 'profit' ? b.profit - a.profit : b.units - a.units);
    }, [filteredBets, bettors, metric]);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-3xl font-black text-white">Relatórios</h2>
                    <div className="flex gap-2">
                        <DateFilterControls filter={filter} date={selectedDate} setDate={setSelectedDate} />
                        <div className="flex gap-2 bg-dark-800 p-1 rounded-lg border border-white/5">
                            {['Geral', 'Hoje', 'Mês', 'Ano'].map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>{f}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex self-end bg-dark-800 p-1 rounded-lg border border-white/5">
                     <button onClick={() => setMetric('units')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${metric === 'units' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Unidades (u)</button>
                     <button onClick={() => setMetric('profit')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${metric === 'profit' ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Lucro (R$)</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-dark-800 p-6 rounded-xl border border-white/5 flex flex-col h-[400px]">
                    <h3 className="text-white font-bold mb-4">{metric === 'profit' ? 'Lucro por Apostador' : 'Unidades por Apostador'}</h3>
                    <div className="flex-1 min-h-0 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ left: 0, right: 0, top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                                <YAxis stroke="#94a3b8" />
                                {/* Tooltip removed */}
                                <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={(metric === 'profit' ? entry.profit : entry.units) >= 0 ? '#3b82f6' : '#f87171'} />)}
                                    <LabelList 
                                        dataKey={metric} 
                                        content={<CustomBarLabel formatter={(val: number) => metric === 'profit' ? `R$ ${val.toFixed(0)}` : `${val.toFixed(1)}u`} />} 
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-dark-800 p-6 rounded-xl border border-white/5 flex flex-col h-[400px]">
                    <h3 className="text-white font-bold mb-4">% de Acerto (Win Rate)</h3>
                    <div className="flex-1 min-h-0 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...data].sort((a,b) => b.winRate - a.winRate)} margin={{ left: 0, right: 0, top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                {/* Tooltip removed */}
                                <Bar dataKey="winRate" radius={[4, 4, 0, 0]} fill="#a855f7">
                                    <LabelList 
                                        dataKey="winRate" 
                                        content={<CustomBarLabel formatter={(val: number) => `${val.toFixed(0)}%`} />} 
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const BettorsPage = ({ bettors, onAdd, onDelete, onToggleStatus, isAdmin }: { bettors: Bettor[], onAdd: (n:string, a:string) => void, onDelete: (id:number) => void, onToggleStatus: (id:number) => void, isAdmin: boolean }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, avatar);
    setName('');
    setAvatar('');
  };

  return (
    <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-white">Apostadores</h2>
      </div>

      {isAdmin && (
        <form onSubmit={handleSubmit} className="bg-dark-800 p-6 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500" placeholder="Ex: João Silva" />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Avatar URL (Opcional)</label>
            <input value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500" placeholder="https://..." />
          </div>
          <button type="submit" className="h-10 px-6 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-400 w-full md:w-auto">Adicionar</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bettors.map(bettor => (
          <div key={bettor.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar url={bettor.avatar} name={bettor.name} size="md" />
              <div>
                <p className="text-white font-bold">{bettor.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${bettor.status === 'Ativo' ? 'bg-success-500/10 text-success-400 border-success-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {bettor.status}
                </span>
              </div>
            </div>
            {isAdmin && (
                <div className="flex items-center gap-2">
                    <button onClick={() => onToggleStatus(bettor.id)} title="Alterar Status" className="size-8 rounded bg-dark-700 text-gray-400 hover:text-white border border-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">sync_alt</span>
                    </button>
                    <button onClick={() => { if(confirm('Excluir?')) onDelete(bettor.id); }} title="Excluir" className="size-8 rounded bg-dark-700 text-gray-400 hover:text-red-400 border border-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AccessPage = ({ users, onAddUser, onDeleteUser }: { users: User[], onAddUser: (u: User) => void, onDeleteUser: (id: number) => void }) => {
    const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'viewer' as 'admin'|'editor'|'viewer', email: '', avatar: '' });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.username || !formData.password || !formData.name) return;
        
        onAddUser({
            id: Date.now(),
            ...formData,
            status: 'Ativo'
        });
        setFormData({ name: '', username: '', password: '', role: 'viewer', email: '', avatar: '' });
    };

    return (
        <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6">
            <h2 className="text-3xl font-black text-white">Gerenciamento de Acesso</h2>
            
            <form onSubmit={handleSubmit} className="bg-dark-800 p-6 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><h3 className="text-white font-bold mb-2">Novo Usuário</h3></div>
                
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Nome</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Usuário (Login)</label>
                    <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500" />
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Senha</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500" />
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Função</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="h-10 bg-dark-900 border border-white/10 rounded-lg px-3 text-white outline-none focus:border-brand-500">
                        <option value="viewer">Visualizador</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <button type="submit" className="h-10 px-6 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-400 w-full">Criar Usuário</button>
                </div>
            </form>

            <div className="flex flex-col gap-3">
                {users.map(user => (
                    <div key={user.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar url={user.avatar} name={user.name} size="md" />
                            <div>
                                <p className="text-white font-bold">{user.name}</p>
                                <p className="text-xs text-gray-400">@{user.username} • <span className="capitalize">{user.role}</span></p>
                            </div>
                        </div>
                        <button onClick={() => { if(confirm('Excluir usuário?')) onDeleteUser(user.id); }} className="size-9 rounded bg-dark-700 text-gray-400 hover:text-red-400 border border-white/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
        
        const fetchWithTimeout = async (url: string, ms = 15000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), ms);
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        const [betsData, bettorsData, usersData] = await Promise.all([
          fetchWithTimeout(`${API_URL}?action=getBets`).then(res => res.json()),
          fetchWithTimeout(`${API_URL}?action=getBettors`).then(res => res.json()),
          fetchWithTimeout(`${API_URL}?action=getUsers`).then(res => res.json())
        ]);

        if(Array.isArray(betsData)) {
            const normalizedBets = betsData.map((b: any) => {
                // Ensure potential profit is calculated correctly if missing or 0
                // Crucial fix: Do not default to totalOdds if potentialProfit is 0
                let pp = b.potentialProfit;
                if (pp === undefined || pp === null || pp === '') {
                     pp = b.PotentialProfit;
                }
                
                // If pp is explicitly 0, keep it 0. If it is null/undefined, calculate it.
                if (pp === undefined || pp === null || pp === '') {
                     const s = Number(b.stake || b.Stake) || 0;
                     const o = Number(b.totalOdds || b.TotalOdds) || 0;
                     if(s > 0 && o > 0) pp = (s * o) - s;
                     else pp = 0;
                }

                return {
                    id: Number(b.id || b.ID), 
                    date: b.date || b.Date,
                    bettor: b.bettor || b.Bettor,
                    type: b.type || b.Type,
                    selections: Array.isArray(b.selections) ? b.selections : (Array.isArray(b.Selections) ? b.Selections : []), 
                    stake: Number(b.stake || b.Stake),
                    totalOdds: Number(b.totalOdds || b.TotalOdds),
                    potentialProfit: Number(pp),
                    status: normalizeStatus(b.status || b.Status || b.PotentialProfit),
                    isCashout: b.isCashout || b.IsCashout || b.Status
                };
            });
            setBets(normalizedBets.sort((a:Bet, b:Bet) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        if(Array.isArray(bettorsData)) {
            const normalizedBettors = bettorsData.map((b: any) => ({
                id: Number(b.id || b.ID),
                name: b.name || b.Name,
                date: b.date || b.Date,
                status: b.status || b.Status,
                avatar: b.avatar || b.Avatar
            }));
            setBettors(normalizedBettors);
        }

        if(Array.isArray(usersData)) {
            const normalizedUsers = usersData.map((u: any) => ({
                id: Number(u.id || u.ID),
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

  // ... (handlers handleLogin, handleLogout, etc. remain same) ...
  const handleLogin = (session: UserSession) => { setUser(session); setPage('dashboard'); };
  const handleLogout = () => { setUser(null); setPage('dashboard'); };

  const handleNavigate = (targetPage: PageType) => {
    if (targetPage === 'new-bet') {
      setEditingBet(null);
    }
    setPage(targetPage);
  };

  const handleSaveBet = async (bet: Bet) => {
    setBets(prevBets => {
        const isEditing = prevBets.some(b => b.id === bet.id);
        if (isEditing) {
            return prevBets.map(b => b.id === bet.id ? bet : b);
        } else {
            return [bet, ...prevBets];
        }
    });
    setPage('ledger');
    const isEditing = bets.some(b => b.id === bet.id);
    await apiPost({ action: isEditing ? 'editBet' : 'addBet', payload: bet });
  };

  const handleDeleteBet = async (id: number) => {
      setBets(prevBets => prevBets.filter(b => b.id !== id));
      await apiPost({ action: 'deleteBet', id: id }); 
  };

  const handleAddBettor = async (name: string, avatar: string) => {
    const newBettor: Bettor = { id: Date.now(), name, date: new Date().toLocaleDateString(), status: 'Ativo', avatar };
    setBettors(prev => [...prev, newBettor]);
    await apiPost({ action: 'addBettor', payload: newBettor });
  };

  const handleDeleteBettor = async (id: number) => {
      setBettors(prev => prev.filter(b => b.id !== id));
      await apiPost({ action: 'deleteBettor', id });
  };
  
  const handleToggleBettorStatus = async (id: number) => {
      let newStatus = 'Ativo';
      setBettors(prev => prev.map(b => {
          if (b.id === id) {
              newStatus = b.status === 'Ativo' ? 'Inativo' : 'Ativo';
              return { ...b, status: newStatus as 'Ativo' | 'Inativo' };
          }
          return b;
      }));
      await apiPost({ action: 'updateBettorStatus', id, status: newStatus });
  };

  const handleUpdateStatus = async (id: number, status: BetStatus, newProfit?: number, isCashout: boolean = false) => {
      setBets(prevBets => prevBets.map(b => {
          if (b.id !== id) return b;
          const updated = { ...b, status, isCashout };
          if (newProfit !== undefined) updated.potentialProfit = newProfit;
          return updated;
      }));
      await apiPost({ action: 'updateBetStatus', id, status, profit: newProfit, isCashout });
  };

  const handleAddUser = async (user: User) => {
      setUsers(prev => [...prev, user]);
      await apiPost({ action: 'addUser', payload: user });
  };

  const handleDeleteUser = async (id: number) => {
      setUsers(prev => prev.filter(u => u.id !== id));
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
    <div className="flex min-h-screen md:h-screen bg-dark-950 font-sans md:overflow-hidden">
      <Sidebar activePage={page} onNavigate={handleNavigate} user={user} onLogout={handleLogout} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 w-full p-4 pb-40 md:p-8 md:pb-8 md:overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-full">
          <div className="md:hidden flex items-center justify-between mb-6">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-white bg-dark-800 rounded-lg border border-white/10"><span className="material-symbols-outlined">menu</span></button>
             <span className="font-bold text-white">BetManager</span>
             <div className="w-10"></div>
          </div>
          {page === 'dashboard' && <DashboardPage bets={bets} onNewBet={() => { setEditingBet(null); setPage('new-bet'); }} isAdmin={user.role === 'admin'} />}
          {page === 'new-bet' && <NewBetPage onSave={handleSaveBet} onCancel={() => setPage('dashboard')} editBet={editingBet} bettors={bettors} />}
          {page === 'ranking' && <RankingPage bets={bets} bettors={bettors} />}
          {page === 'ledger' && <LedgerPage bets={bets} onEdit={(b: Bet) => { setEditingBet(b); setPage('new-bet'); }} onDelete={handleDeleteBet} onUpdateStatus={handleUpdateStatus} isAdmin={user.role === 'admin'} />}
          {page === 'bettors' && <BettorsPage bettors={bettors} onAdd={handleAddBettor} onDelete={handleDeleteBettor} onToggleStatus={handleToggleBettorStatus} isAdmin={user.role === 'admin'} />}
          {page === 'reports' && <ReportsPage bettors={bettors} bets={bets} />}
          {page === 'access' && <AccessPage users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} />}
        </div>
      </main>
    </div>
  );
};

export default App;