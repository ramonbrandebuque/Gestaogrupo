import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';

// --- CONFIGURATION ---
// SUBSTITUA A URL ABAIXO PELA URL DO SEU GOOGLE APPS SCRIPT QUANDO ESTIVER PRONTO
const API_URL = 'COLE_SUA_URL_DO_GOOGLE_SCRIPT_AQUI'; 

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
  selections: Selection[];
  stake: number;
  totalOdds: number;
  potentialProfit: number;
  status: BetStatus;
  isCashout?: boolean;
}

interface Bettor {
  id: number;
  name: string;
  date: string;
  status: 'Ativo' | 'Inativo';
  avatar?: string; // Link direto para foto
}

interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  avatar?: string; // Link direto para foto
}

interface UserSession {
  username: string;
  role: 'admin' | 'editor' | 'viewer';
  name: string;
  avatar?: string;
}

const performanceData = [
  { name: 'Week 1', value: 2000 },
  { name: 'Week 2', value: 3500 },
  { name: 'Week 3', value: 2800 },
  { name: 'Week 4', value: 4200 },
  { name: 'Week 5', value: 5100 },
  { name: 'Week 6', value: 6800 },
  { name: 'Week 7', value: 7400 },
  { name: 'Week 8', value: 8900 },
  { name: 'Week 9', value: 9500 },
  { name: 'Week 10', value: 11200 },
  { name: 'Week 11', value: 11800 },
  { name: 'Week 12', value: 12450 },
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
    const betDate = new Date(betDateStr + 'T12:00:00'); 

    switch (period) {
      case 'Hoje':
        return betDateStr === todayStr;
      case 'Mês':
        return betDate.getMonth() === now.getMonth() && betDate.getFullYear() === now.getFullYear();
      case 'Ano':
        return betDate.getFullYear() === now.getFullYear();
      case 'Periodo':
        if (!start || !end) return true;
        return betDateStr >= start && betDateStr <= end;
      case 'Geral':
      default:
        return true;
    }
  });
};

// Componente visual para Avatar (Imagem ou Iniciais)
const Avatar = ({ url, name, size = 'md', className = '' }: { url?: string, name: string, size?: 'sm'|'md'|'lg'|'xl', className?: string }) => {
    const sizeClasses = {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-16 text-xl',
        xl: 'size-24 text-3xl'
    };

    if (url && url.length > 5) {
        return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border border-white/10 ${className}`} />;
    }
    
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-dark-700 flex items-center justify-center font-bold text-gray-300 uppercase border border-white/10 ${className}`}>
            {name.substring(0, 2)}
        </div>
    );
};

// --- API Helper ---
const apiPost = async (payload: any) => {
  if(API_URL.includes('https://script.google.com/macros/s/AKfycbxCKCU0IvpMKOD_5R574da4pQSDzwJiNC6W9ZDo9Yo63mWqFsAmiSkdMQXhh9t5Q3Df/exec')) {
    console.log("Mock API Call:", payload);
    return { result: 'success' };
  }
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    alert("Erro ao salvar dados. Verifique sua conexão.");
    throw error;
  }
};

// --- Logo Component (Gelo) ---
const IceLogo = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => {
    const isSmall = size === 'sm';
    return (
        <div className={`${isSmall ? 'size-10' : 'size-20'} rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg ring-1 ring-white/20`}>
            <span className={`material-symbols-outlined ${isSmall ? 'text-xl' : 'text-5xl'} text-white`}>ac_unit</span>
        </div>
    );
};

// --- Login Page ---
const LoginPage = ({ onLogin, users, isLoading }: { onLogin: (session: UserSession) => void, users: User[], isLoading: boolean }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      if (user.status !== 'Ativo') {
        setError('Usuário inativo. Contate o administrador.');
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
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Usuário</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-500 outline-none" placeholder="Ex: Ramon" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-500 outline-none" placeholder="••••••" />
          </div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          <button disabled={isLoading} type="submit" className="mt-2 w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg transition-all">
             {isLoading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
        {API_URL.includes('COLE_SUA') && (
            <p className="mt-4 text-center text-xs text-gray-500">Modo Demo: Use <b>Ramon</b> / <b>123</b></p>
        )}
      </div>
    </div>
  );
};

// --- Sidebar ---
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

  const handleNav = (id: string) => {
    setPage(id);
    onClose(); 
  };

  return (
    <>
        {/* Mobile Backdrop */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                onClick={onClose}
            ></div>
        )}
        
        {/* Sidebar Element */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-white/5 flex flex-col h-full transition-transform duration-300 ease-in-out md:translate-x-0 md:relative ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full justify-between p-4">
            <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2 pt-2">
                <IceLogo size="sm" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-white text-xs font-black uppercase leading-tight">Gestão de Apostas<br/>em Grupo</h1>
                </div>
                <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <nav className="flex flex-col gap-1">
                {menuItems.map((item) => (
                <button key={item.id} onClick={() => handleNav(item.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${activePage === item.id ? 'bg-brand-500/10 text-brand-400' : 'text-gray-400 hover:text-white'}`}>
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

// --- Dashboard ---
const DashboardPage = ({ bets, onNewBet, isAdmin }: { bets: Bet[], onNewBet: () => void, isAdmin: boolean }) => {
  const totalBankroll = bets.reduce((acc, bet) => acc + (Number(bet.stake)||0), 0);
  const totalProfit = bets.reduce((acc, bet) => {
    if (bet.status === 'WIN') return acc + (Number(bet.potentialProfit)||0);
    if (bet.status === 'LOSS') return acc - (Number(bet.stake)||0);
    return acc;
  }, 0);
  
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
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- New Bet ---
const NewBetPage = ({ onSave, onCancel, editBet, bettors }: { onSave: (bet: Bet) => void, onCancel: () => void, editBet: Bet | null, bettors: Bettor[] }) => {
  const [bettor, setBettor] = useState(editBet?.bettor || '');
  const [stake, setStake] = useState<string>(editBet?.stake.toString() || '50.00');
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
      bettor, stake: numericStake, selections, totalOdds, potentialProfit,
      status: editBet?.status || 'PENDING',
      type: selections.length > 1 ? 'Múltipla' : 'Simples'
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

// --- Reports ---
const ReportsPage = ({ bettors, bets }: { bettors: Bettor[], bets: Bet[] }) => {
    const [filterType, setFilterType] = useState<'Hoje'|'Mês'|'Ano'|'Periodo'|'Geral'>('Geral');
    const [reportMode, setReportMode] = useState<'money' | 'units'>('money');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredBets = useMemo(() => filterBetsByPeriod(bets, filterType, startDate, endDate), [bets, filterType, startDate, endDate]);

    const getBetValue = (bet: Bet) => {
        if (bet.status === 'PENDING') return 0;
        if (reportMode === 'money') {
            return bet.status === 'WIN' ? Number(bet.potentialProfit) : -Number(bet.stake);
        } else {
            // Unit calculation: Win = (Odds - 1), Loss = -1
            return bet.status === 'WIN' ? (bet.totalOdds - 1) : -1;
        }
    };

    const monthlyData = filteredBets.reduce((acc: any, bet) => {
        let key = bet.date.substring(0, 7); 
        if (filterType === 'Mês' || filterType === 'Periodo' || filterType === 'Hoje') key = bet.date;
        if (!acc[key]) acc[key] = { name: key, profit: 0 };
        acc[key].profit += getBetValue(bet);
        return acc;
    }, {});
    
    const chartData = Object.values(monthlyData).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const playerData = bettors.map(b => {
        const userProfit = filteredBets.filter(bet => bet.bettor === b.name).reduce((acc, bet) => acc + getBetValue(bet), 0);
        return { name: b.name, value: userProfit };
    }).sort((a,b) => b.value - a.value);

    const formatValue = (val: number) => reportMode === 'money' ? formatCurrency(val) : `${val.toFixed(2)}u`;

    return (
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div><h1 className="text-3xl font-black text-white">Relatórios</h1><p className="text-gray-400">Análise detalhada.</p></div>
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                    <div className="flex bg-dark-800 p-1 rounded-lg">
                         <button onClick={() => setReportMode('money')} className={`px-4 py-1 font-bold rounded ${reportMode==='money'?'bg-success-500 text-white':'text-gray-400'}`}>R$</button>
                         <button onClick={() => setReportMode('units')} className={`px-4 py-1 font-bold rounded ${reportMode==='units'?'bg-purple-500 text-white':'text-gray-400'}`}>Un</button>
                    </div>
                    <div className="flex gap-2 bg-dark-800 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
                        {['Hoje', 'Mês', 'Ano', 'Geral', 'Periodo'].map((t) => (
                            <button key={t} onClick={() => setFilterType(t as any)} className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${filterType === t ? 'bg-[#8b5cf6] text-white' : 'text-gray-400'}`}>{t}</button>
                        ))}
                    </div>
                </div>
            </div>
            {filterType === 'Periodo' && <div className="flex gap-2 justify-end"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-dark-800 text-white rounded p-2"/><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-dark-800 text-white rounded p-2"/></div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-white/5 h-[400px]">
                    <h3 className="text-white font-bold mb-6">Lucro Geral ({reportMode === 'money' ? 'R$' : 'Un'})</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <Bar dataKey="profit">
                                { (chartData as any[]).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#8b5cf6' : '#ef4444'} />)}
                                <LabelList dataKey="profit" position="top" fill="#94a3b8" fontSize={12} formatter={formatValue} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-dark-800 p-6 rounded-xl border border-white/5 h-[400px]">
                   <h3 className="text-white font-bold mb-4">Por Jogador ({reportMode === 'money' ? 'R$' : 'Un'})</h3>
                   <ResponsiveContainer width="100%" height="90%">
                     <BarChart data={playerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <Bar dataKey="value">
                             {playerData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#8b5cf6' : '#ef4444'} />)}
                             <LabelList dataKey="value" position="top" fill="#94a3b8" fontSize={12} formatter={formatValue} />
                        </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- Ledger ---
const LedgerPage = ({ bets, onEdit, onDelete, onUpdateStatus, onNewBet, isAdmin }: any) => {
  const [filter, setFilter] = useState<'ALL' | BetStatus>('ALL');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const filteredBets = bets.filter((bet: Bet) => filter === 'ALL' || bet.status === filter);

  const getStatusLabel = (status: BetStatus | 'ALL') => {
      switch(status) {
          case 'ALL': return 'Todos';
          case 'PENDING': return 'Pendente';
          case 'WIN': return 'Vitória';
          case 'LOSS': return 'Derrota';
          default: return status;
      }
  };

  const getStatusColor = (status: BetStatus) => {
      switch(status) {
          case 'WIN': return 'text-green-400 bg-green-900/30 border-green-500/30';
          case 'LOSS': return 'text-red-400 bg-red-900/30 border-red-500/30';
          default: return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      }
  };

  const startCashoutEdit = (bet: Bet) => {
    setEditingId(bet.id);
    const isLoss = bet.status === 'LOSS';
    const isWin = bet.status === 'WIN';
    let val = 0;
    if (isLoss) val = -bet.stake;
    else if (isWin) val = bet.potentialProfit;
    setEditValue(val.toString());
  };

  const saveCashout = (id: number) => {
    const val = parseFloat(editValue);
    if (isNaN(val)) {
        alert("Valor inválido");
        return;
    }
    onUpdateStatus(id, 'WIN', val, true);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-black text-white">Histórico</h1><p className="text-gray-400">Gerencie entradas.</p></div>
        {isAdmin && <button onClick={onNewBet} className="px-4 py-2 rounded-lg bg-brand-500 text-white font-bold w-full md:w-auto">Nova Aposta</button>}
      </div>
      <div className="flex gap-2 mb-2 overflow-x-auto">
         {['ALL', 'PENDING', 'WIN', 'LOSS'].map((s) => (
            <button key={s} onClick={() => setFilter(s as any)} className={`px-3 py-1 rounded-md text-xs font-bold uppercase whitespace-nowrap ${filter === s ? 'bg-white text-black' : 'bg-dark-800 text-gray-400'}`}>{getStatusLabel(s as any)}</button>
         ))}
      </div>
      <div className="bg-dark-800 rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
            <thead className="bg-dark-950 text-gray-400 text-xs uppercase border-b border-white/5">
                <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Apostador</th>
                    <th className="p-4">Seleções</th>
                    <th className="p-4 text-left">Stake</th>
                    <th className="p-4 text-right">Lucro/Prej.</th>
                    <th className="p-4 text-center">Status</th>
                    {isAdmin && <th className="p-4 text-right">Ações</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBets.map((bet: Bet) => {
                const isLoss = bet.status === 'LOSS';
                const isWin = bet.status === 'WIN';
                const profitDisplay = isLoss ? -bet.stake : (isWin ? bet.potentialProfit : bet.potentialProfit);
                
                let profitColor = 'text-gray-500';
                if (bet.status === 'PENDING') profitColor = 'text-gray-500';
                else if (profitDisplay >= 0) profitColor = 'text-green-400';
                else profitColor = 'text-red-400';
                
                const standardProfit = (bet.stake * bet.totalOdds) - bet.stake;

                return (
                <tr key={bet.id} className="hover:bg-white/5">
                  <td className="p-4 text-gray-400">{new Date(bet.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 font-bold text-white">{bet.bettor}</td>
                  <td className="p-4">{bet.selections.map(sel => <div key={sel.id} className="text-xs text-gray-300">{sel.pick} <span className="text-gray-500">@ {sel.event}</span></div>)}</td>
                  <td className="p-4 text-left text-white">{formatCurrency(bet.stake)}</td>
                  <td className="p-4 text-right font-bold">
                    {editingId === bet.id ? (
                        <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-500 text-xs">R$</span>
                            <input 
                                type="number" 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveCashout(bet.id);
                                    if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                className="bg-dark-950 border border-brand-500 rounded px-2 py-1 w-24 text-right text-white outline-none text-sm"
                            />
                            <button onClick={() => saveCashout(bet.id)} className="text-green-500 hover:text-green-400"><span className="material-symbols-outlined text-lg">check</span></button>
                            <button onClick={cancelEdit} className="text-red-500 hover:text-red-400"><span className="material-symbols-outlined text-lg">close</span></button>
                        </div>
                    ) : (
                        <span className={profitColor}>{bet.status === 'PENDING' ? 'Pot. ' : ''}{formatCurrency(profitDisplay)}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isAdmin) return;
                            let nextStatus: BetStatus = 'PENDING';
                            if (bet.status === 'PENDING') nextStatus = 'WIN';
                            else if (bet.status === 'WIN') nextStatus = 'LOSS';
                            else if (bet.status === 'LOSS') nextStatus = 'PENDING';
                            onUpdateStatus(bet.id, nextStatus, standardProfit, false);
                        }}
                        disabled={!isAdmin}
                        title={isAdmin ? "Clique para alterar status" : ""}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getStatusColor(bet.status)} ${isAdmin ? 'cursor-pointer hover:opacity-80 hover:scale-105' : ''}`}
                    >
                        {bet.isCashout ? 'Vitória (Cashout)' : getStatusLabel(bet.status)}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right flex justify-end gap-2 items-center">
                       {bet.status === 'PENDING' && (
                           <>
                            <button onClick={() => onUpdateStatus(bet.id, 'WIN')} className="text-green-500 hover:bg-green-500/20 p-1 rounded" title="Vitória"><span className="material-symbols-outlined">check</span></button>
                            <button onClick={() => onUpdateStatus(bet.id, 'LOSS')} className="text-red-500 hover:bg-red-500/20 p-1 rounded" title="Derrota"><span className="material-symbols-outlined">close</span></button>
                           </>
                       )}
                       <button onClick={() => onEdit(bet)} className="text-blue-400 hover:bg-blue-400/20 p-1 rounded" title="Editar"><span className="material-symbols-outlined">edit</span></button>
                       <button onClick={() => startCashoutEdit(bet)} className="text-yellow-400 hover:bg-yellow-400/20 p-1 rounded" title="Cashout"><span className="material-symbols-outlined">attach_money</span></button>
                       <button onClick={() => onDelete(bet.id)} className="text-gray-400 hover:bg-gray-700 p-1 rounded" title="Excluir"><span className="material-symbols-outlined">delete</span></button>
                    </td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
      </div>
    </div>
  );
};

// --- Bettors ---
const BettorsPage = ({ bettors, onAdd, onDelete, onToggleStatus, isAdmin }: any) => {
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  const handleAdd = () => {
      if(newName) {
          onAdd(newName, newAvatar);
          setNewName('');
          setNewAvatar('');
      }
  }

  return (
    <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6">
       <h1 className="text-3xl font-black text-white">Apostadores</h1>
       {isAdmin && (
         <div className="bg-dark-800 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4">
            <input className="flex-1 bg-dark-950 border border-white/10 rounded-lg py-2 px-3 text-white outline-none focus:border-brand-500" placeholder="Nome do Jogador" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="flex-1 bg-dark-950 border border-white/10 rounded-lg py-2 px-3 text-white outline-none focus:border-brand-500" placeholder="Link da Foto (URL)" value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)} />
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-brand-500 text-white font-bold">Adicionar</button>
         </div>
       )}
       <div className="grid gap-3">
         {bettors.map((bettor: Bettor) => (
           <div key={bettor.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Avatar url={bettor.avatar} name={bettor.name} size="md" />
                 <div><h3 className="font-bold text-white">{bettor.name}</h3><p className="text-xs text-gray-500">{bettor.status}</p></div>
              </div>
              {isAdmin && <div className="flex gap-2"><button onClick={() => onToggleStatus(bettor.id)} className="text-gray-400"><span className="material-symbols-outlined">autorenew</span></button><button onClick={() => onDelete(bettor.id)} className="text-red-400"><span className="material-symbols-outlined">delete</span></button></div>}
           </div>
         ))}
       </div>
    </div>
  );
};

// --- Access ---
const AccessPage = ({ users, setUsers }: any) => {
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'viewer', status: 'Ativo' });
  return (
    <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6">
      <h1 className="text-3xl font-black text-white">Controle de Acesso</h1>
      <div className="bg-dark-800 p-6 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white" placeholder="Nome" value={newUser.name||''} onChange={e=>setNewUser({...newUser, name:e.target.value})}/>
          <input className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white" placeholder="Email" value={newUser.email||''} onChange={e=>setNewUser({...newUser, email:e.target.value})}/>
          <input className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white" placeholder="Usuário" value={newUser.username||''} onChange={e=>setNewUser({...newUser, username:e.target.value})}/>
          <input className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white" placeholder="Senha" type="password" value={newUser.password||''} onChange={e=>setNewUser({...newUser, password:e.target.value})}/>
          <input className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white md:col-span-2" placeholder="Link da Foto (URL)" value={newUser.avatar||''} onChange={e=>setNewUser({...newUser, avatar:e.target.value})}/>
          <select className="bg-dark-950 border border-white/10 rounded-lg p-2 text-white md:col-span-2" value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value as any})}><option value="viewer">Viewer</option><option value="admin">Admin</option></select>
          <button onClick={()=>{if(newUser.username){setUsers([...users,{...newUser,id:Date.now()}]);setNewUser({role:'viewer',status:'Ativo',avatar:''})}}} className="md:col-span-2 bg-brand-500 p-2 rounded-lg text-white font-bold">Adicionar Usuário</button>
      </div>
      <div className="grid gap-3">{users.map((u: User)=><div key={u.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex justify-between"><div className="flex gap-4 items-center"><Avatar url={u.avatar} name={u.name} size="md"/><div><p className="text-white font-bold">{u.name}</p><p className="text-xs text-gray-500">{u.role}</p></div></div><button onClick={()=>setUsers(users.filter((x:User)=>x.id!==u.id))} className="text-red-400"><span className="material-symbols-outlined">delete</span></button></div>)}</div>
    </div>
  );
};

// --- Ranking ---
const RankingPage = ({ bets, bettors }: { bets: Bet[], bettors: Bettor[] }) => {
  const [filterType, setFilterType] = useState<'Hoje'|'Mês'|'Ano'|'Periodo'|'Geral'>('Geral');
  const [rankingMode, setRankingMode] = useState<'money' | 'units'>('money');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredBets = useMemo(() => filterBetsByPeriod(bets, filterType, startDate, endDate), [bets, filterType, startDate, endDate]);

  const bettorStats = useMemo(() => {
    return bettors.map(bettor => {
      const userBets = filteredBets.filter(b => b.bettor === bettor.name);
      const wins = userBets.filter(b => b.status === 'WIN').length;
      const losses = userBets.filter(b => b.status === 'LOSS').length;
      
      const profit = userBets.reduce((acc, b) => {
          if (b.status === 'PENDING') return acc;
          if (rankingMode === 'money') {
             if (b.status === 'WIN') return acc + (Number(b.potentialProfit)||0);
             if (b.status === 'LOSS') return acc - (Number(b.stake)||0);
          } else {
             if (b.status === 'WIN') return acc + (Number(b.totalOdds) - 1);
             if (b.status === 'LOSS') return acc - 1;
          }
          return acc;
      }, 0);

      const totalStakeResolved = userBets.reduce((acc, b) => (b.status === 'WIN' || b.status === 'LOSS') ? acc + (Number(b.stake)||0) : acc, 0);
      const roi = totalStakeResolved > 0 ? (profit / (rankingMode === 'money' ? totalStakeResolved : (wins + losses))) * 100 : 0;
      return { ...bettor, totalBets: userBets.length, wins, profit, winRate: (wins+losses)>0?(wins/(wins+losses))*100:0, roi };
    }).sort((a, b) => b.profit - a.profit);
  }, [bettors, filteredBets, rankingMode]);

  const top3 = bettorStats.slice(0, 3);
  
  // Show ALL bettors in the table, starting from index 0 (which corresponds to Rank #1)
  const rankingTableData = bettorStats;

  const formatValue = (val: number) => rankingMode === 'money' ? formatCurrency(val) : `${val.toFixed(2)}u`;

  return (
    <div className="max-w-[1024px] mx-auto w-full flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div><h2 className="text-3xl font-black text-white">Ranking</h2><p className="text-gray-400">Classificação.</p></div>
        <div className="flex flex-col items-end gap-2">
            <div className="flex bg-dark-800 p-1 rounded-lg">
                <button onClick={() => setRankingMode('money')} className={`px-4 py-1 font-bold rounded ${rankingMode==='money'?'bg-success-500 text-white':'text-gray-400'}`}>R$</button>
                <button onClick={() => setRankingMode('units')} className={`px-4 py-1 font-bold rounded ${rankingMode==='units'?'bg-purple-500 text-white':'text-gray-400'}`}>Un</button>
            </div>
            <div className="flex gap-2 bg-dark-800 p-1 rounded-lg">
               {['Hoje', 'Mês', 'Ano', 'Geral', 'Periodo'].map(t => <button key={t} onClick={()=>setFilterType(t as any)} className={`px-3 py-1 text-sm ${filterType===t?'bg-[#8b5cf6] text-white rounded':'text-gray-400'}`}>{t}</button>)}
            </div>
            {filterType === 'Periodo' && <div className="flex gap-2"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-dark-800 text-white rounded p-1 text-xs"/><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-dark-800 text-white rounded p-1 text-xs"/></div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-end pt-8">
         {[1, 0, 2].map((idx) => {
             const b = top3[idx];
             if(!b) return <div key={idx}></div>;
             return (
                 <div key={b.id} className={`flex flex-col items-center ${idx===0?'-mt-8 z-10':''}`}>
                     <Avatar url={b.avatar} name={b.name} size="xl" className={`border-4 ${idx===0?'border-[#8b5cf6] size-32 text-4xl':'border-gray-500'}`} />
                     <p className="font-bold mt-2 text-white">{b.name}</p>
                     <p className={`font-black text-xl ${b.profit>=0?'text-green-400':'text-red-400'}`}>{formatValue(b.profit)}</p>
                 </div>
             )
         })}
      </div>

      <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-left text-sm">
           <thead className="bg-dark-950 text-gray-400 uppercase"><tr><th className="p-4">Pos</th><th className="p-4">Apostador</th><th className="p-4 text-right">ROI</th><th className="p-4 text-right">Lucro</th></tr></thead>
           <tbody className="divide-y divide-white/5">
             {rankingTableData.map((b, i) => (
                <tr key={b.id} className="hover:bg-white/5">
                   <td className="p-4 text-gray-500">#{i+1}</td>
                   <td className="p-4 font-bold text-white flex items-center gap-3">
                       <Avatar url={b.avatar} name={b.name} size="sm" />
                       {b.name}
                   </td>
                   <td className={`p-4 text-right font-bold ${b.roi>=0?'text-green-400':'text-red-400'}`}>{b.roi.toFixed(1)}%</td>
                   <td className={`p-4 text-right font-bold ${b.profit>=0?'text-green-400':'text-red-400'}`}>{formatValue(b.profit)}</td>
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

  // FETCH DATA ON LOAD
  useEffect(() => {
    const fetchData = async () => {
      // MOCK DATA FOR PREVIEW MODE
      if(API_URL.includes('COLE_SUA_URL')) {
        setTimeout(() => {
            setUsers([{id: 1, username: 'ramon', password: '123', name: 'Ramon Admin', role: 'admin', email: 'admin@test.com', status: 'Ativo', avatar: 'https://i.pravatar.cc/150?u=ramon'}]);
            setBettors([
                {id:1, name:'Ramon', date:'2023-01-01', status:'Ativo', avatar: 'https://i.pravatar.cc/150?u=ramon'}, 
                {id:2, name:'João', date:'2023-01-01', status:'Ativo', avatar: 'https://i.pravatar.cc/150?u=joao'},
                {id:3, name:'Maria', date:'2023-01-01', status:'Ativo'} 
            ]);
            setBets([{id:1, date: new Date().toISOString(), bettor:'Ramon', type:'Simples', selections:[{id:'1', event:'Real x Barça', pick:'Real ML', odds:2.0}], stake:100, totalOdds:2.0, potentialProfit:100, status:'WIN'}]);
            setLoading(false);
        }, 1000);
        return;
      }

      try {
        setLoading(true);
        const [betsData, bettorsData, usersData] = await Promise.all([
          fetch(`${API_URL}?action=getBets`).then(res => res.json()),
          fetch(`${API_URL}?action=getBettors`).then(res => res.json()),
          fetch(`${API_URL}?action=getUsers`).then(res => res.json())
        ]);
        
        if(Array.isArray(betsData)) setBets(betsData.sort((a:Bet, b:Bet) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        if(Array.isArray(bettorsData)) setBettors(bettorsData);
        if(Array.isArray(usersData)) setUsers(usersData);

      } catch (error) {
        console.error("Failed to load data", error);
        alert("Falha ao carregar dados da planilha.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = (session: UserSession) => { setUser(session); setPage('dashboard'); };
  const handleLogout = () => { setUser(null); setPage('dashboard'); };

  const handleSaveBet = async (bet: Bet) => {
    const newBets = [bet, ...bets];
    setBets(newBets);
    setPage('ledger');
    await apiPost({ action: 'addBet', payload: bet });
  };

  const handleAddBettor = async (name: string, avatar: string) => {
    const newBettor: Bettor = { id: Date.now(), name, date: new Date().toLocaleDateString(), status: 'Ativo', avatar };
    setBettors([...bettors, newBettor]);
    await apiPost({ action: 'addBettor', payload: newBettor });
  };

  const handleDeleteBettor = (id: number) => setBettors(bettors.filter(b => b.id !== id));
  
  const handleToggleBettorStatus = (id: number) => setBettors(bettors.map(b => b.id===id ? {...b, status: b.status==='Ativo'?'Inativo':'Ativo'} : b));

  const handleUpdateStatus = async (id: number, status: BetStatus, newProfit?: number, isCashout: boolean = false) => {
      setBets(bets.map(b => {
          if (b.id !== id) return b;
          const updated = { ...b, status, isCashout };
          if (newProfit !== undefined) updated.potentialProfit = newProfit;
          return updated;
      }));

      await apiPost({
        action: 'updateBetStatus',
        id,
        status,
        profit: newProfit,
        isCashout
      });
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
      <Sidebar 
        activePage={page} 
        setPage={setPage} 
        user={user} 
        onLogout={handleLogout} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-white bg-dark-800 rounded-lg border border-white/10">
                <span className="material-symbols-outlined">menu</span>
             </button>
             <span className="font-bold text-white">BetManager</span>
             <div className="w-10"></div> {/* Spacer for center alignment */}
          </div>

          {page === 'dashboard' && <DashboardPage bets={bets} onNewBet={() => { setEditingBet(null); setPage('new-bet'); }} isAdmin={user.role === 'admin'} />}
          {page === 'new-bet' && <NewBetPage onSave={handleSaveBet} onCancel={() => setPage('dashboard')} editBet={editingBet} bettors={bettors} />}
          {page === 'ranking' && <RankingPage bets={bets} bettors={bettors} />}
          {page === 'ledger' && <LedgerPage bets={bets} onEdit={(b: Bet) => { setEditingBet(b); setPage('new-bet'); }} onDelete={(id: number) => setBets(bets.filter(b => b.id !== id))} onUpdateStatus={handleUpdateStatus} onNewBet={() => { setEditingBet(null); setPage('new-bet'); }} isAdmin={user.role === 'admin'} />}
          {page === 'bettors' && <BettorsPage bettors={bettors} onAdd={handleAddBettor} onDelete={handleDeleteBettor} onToggleStatus={handleToggleBettorStatus} isAdmin={user.role === 'admin'} />}
          {page === 'reports' && <ReportsPage bettors={bettors} bets={bets} />}
          {page === 'access' && <AccessPage users={users} setUsers={setUsers} />}
        </div>
      </main>
    </div>
  );
};

export default App;
