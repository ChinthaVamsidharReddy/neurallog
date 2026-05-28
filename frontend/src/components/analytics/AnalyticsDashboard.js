import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, Zap, Clock, TrendingUp, AlertTriangle,
  CheckCircle, Database, Gauge, XCircle
} from 'lucide-react';
import { analyticsApi } from '../../services/api';

const PROVIDER_COLORS = { openai: '#10a37f', gemini: '#4285f4', groq: '#f55036' };
const TOOLTIP_STYLE = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 12, color: 'var(--text-primary)'
};

export default function AnalyticsDashboard() {
  const [summary,      setSummary]      = useState(null);
  const [latencyData,  setLatencyData]  = useState([]);
  const [tokenData,    setTokenData]    = useState([]);
  const [providerData, setProviderData] = useState([]);
  const [throughputData, setThroughputData] = useState([]);
  const [errorData,    setErrorData]    = useState([]);
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [timeRange,    setTimeRange]    = useState('24h');
  const [providerFilter, setProviderFilter] = useState('all');

  useEffect(() => { fetchAll(); }, [timeRange, providerFilter]); // eslint-disable-line

  const fetchAll = async () => {
    setLoading(true);
    const params = { timeRange, provider: providerFilter !== 'all' ? providerFilter : undefined };
    try {
      const [sumRes, latRes, tokRes, provRes, logRes, thrRes, errRes] = await Promise.allSettled([
        analyticsApi.summary(params),
        analyticsApi.latency(params),
        analyticsApi.tokenUsage(params),
        analyticsApi.providerBreakdown(params),
        analyticsApi.logs({ ...params, limit: 20 }),
        analyticsApi.throughput(params),
        analyticsApi.errorRate(params),
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (latRes.status === 'fulfilled') setLatencyData(latRes.value.data);
      if (tokRes.status === 'fulfilled') setTokenData(tokRes.value.data);
      if (provRes.status === 'fulfilled') setProviderData(provRes.value.data);
      if (logRes.status === 'fulfilled') setLogs(logRes.value.data);
      if (thrRes.status === 'fulfilled') setThroughputData(thrRes.value.data);
      if (errRes.status === 'fulfilled') setErrorData(errRes.value.data);
    } catch {}
    setLoading(false);
  };

  // ── Demo data (shown when backend not yet connected) ──────────────
  const demoSummary = {
    totalRequests: 1247, avgLatencyMs: 823, totalTokens: 482930,
    successRate: 97.8, errorCount: 27, activeConversations: 43,
    throughputRpm: 4.2,
  };

  const demoLatency = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    avg: Math.floor(600 + Math.random() * 600),
    p95: Math.floor(1200 + Math.random() * 800),
  }));

  const demoTokens = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      input:  Math.floor(20000 + Math.random() * 30000),
      output: Math.floor(10000 + Math.random() * 15000),
    };
  });

  const demoProviders = [
    { name: 'OpenAI', value: 58, color: '#10a37f' },
    { name: 'Gemini', value: 28, color: '#4285f4' },
    { name: 'Groq',   value: 14, color: '#f55036' },
  ];

  // Throughput: requests per hour over last 24h
  const demoThroughput = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    rpm:    parseFloat((2 + Math.random() * 8).toFixed(1)),
    total:  Math.floor(30 + Math.random() * 120),
  }));

  // Error rate: success vs error counts per hour
  const demoErrors = Array.from({ length: 24 }, (_, i) => ({
    hour:       `${i}:00`,
    errors:     Math.floor(Math.random() * 4),
    total:      Math.floor(40 + Math.random() * 80),
    errorRate:  parseFloat((Math.random() * 6).toFixed(1)),
  }));

  const s    = summary       || demoSummary;
  const lData = latencyData.length   ? latencyData   : demoLatency;
  const tData = tokenData.length     ? tokenData     : demoTokens;
  const pData = providerData.length  ? providerData  : demoProviders;
  const thrData = throughputData.length ? throughputData : demoThroughput;
  const errData = errorData.length   ? errorData     : demoErrors;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>
              Observability Dashboard
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Real-time LLM inference metrics · Latency · Throughput · Errors
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['1h', '24h', '7d', '30d'].map(r => (
                <button key={r} onClick={() => setTimeRange(r)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  background: timeRange === r ? 'var(--bg-active)' : 'none',
                  color: timeRange === r ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '12px', fontFamily: 'var(--font-body)',
                  borderRight: '1px solid var(--border-subtle)', transition: 'all 0.15s',
                }}>{r}</button>
              ))}
            </div>
            <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
              style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', outline: 'none' }}>
              <option value="all">All providers</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <KpiCard icon={<Activity size={16}/>}    label="Total Requests"       value={s.totalRequests?.toLocaleString()} change="+12%" positive />
          <KpiCard icon={<Clock size={16}/>}        label="Avg Latency"          value={`${s.avgLatencyMs}ms`}             change="-8%"  positive />
          <KpiCard icon={<Gauge size={16}/>}        label="Throughput (req/min)" value={s.throughputRpm ?? thrData[thrData.length-1]?.rpm ?? '–'} change="+5%" positive />
          <KpiCard icon={<Database size={16}/>}     label="Total Tokens"         value={formatTokens(s.totalTokens)}       change="+24%" positive />
          <KpiCard icon={<CheckCircle size={16}/>}  label="Success Rate"         value={`${s.successRate}%`}               change="+0.3%" positive />
          <KpiCard icon={<AlertTriangle size={16}/>} label="Total Errors"        value={s.errorCount}                      change="-15%" positive />
          <KpiCard icon={<XCircle size={16}/>}      label="Error Rate"           value={`${(100 - (s.successRate || 97.8)).toFixed(1)}%`} change="-0.3%" positive />
          <KpiCard icon={<Zap size={16}/>}          label="Active Conversations" value={s.activeConversations}             change="+5%"  positive />
        </div>

        {/* ── Row 1: Latency + Provider ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <ChartCard title="Latency Over Time" subtitle="Average & P95 response time (ms)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={lData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#5b9cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#5b9cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="hour" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
                <Area type="monotone" dataKey="avg" stroke="#00d4ff" strokeWidth={2} fill="url(#avgGrad)" name="Avg ms"/>
                <Area type="monotone" dataKey="p95" stroke="#5b9cf6" strokeWidth={1.5} fill="url(#p95Grad)" name="P95 ms" strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Provider Distribution" subtitle="Request share by provider">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={pData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || Object.values(PROVIDER_COLORS)[i % 3]} stroke="none"/>
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}` }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.value}% · {p.count ?? '–'} reqs</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ── Row 2: Throughput + Error Rate ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Throughput chart */}
          <ChartCard title="Throughput" subtitle="Requests per minute over time">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={thrData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00c97a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00c97a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="hour" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="left"  tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="right" orientation="right" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
                <Area  yAxisId="left"  type="monotone" dataKey="rpm"   stroke="#00c97a" strokeWidth={2} fill="url(#rpmGrad)" name="Req/min"/>
                <Bar   yAxisId="right" dataKey="total" fill="rgba(0,201,122,0.15)" name="Total reqs" radius={[2,2,0,0]}/>
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Error rate chart */}
          <ChartCard title="Error Rate" subtitle="Errors vs total requests per hour">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={errData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff4d6a" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#ff4d6a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="hour" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="left"  tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}/>
                <YAxis yAxisId="right" orientation="right" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => name === 'Error rate %' ? [`${v}%`, name] : [v, name]}/>
                <Area  yAxisId="left"  type="monotone" dataKey="errorRate" stroke="#ff4d6a" strokeWidth={2} fill="url(#errGrad)" name="Error rate %"/>
                <Bar   yAxisId="right" dataKey="errors" fill="rgba(255,77,106,0.25)" name="Error count" radius={[2,2,0,0]}/>
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Row 3: Token consumption ─────────────────────────────── */}
        <ChartCard title="Token Consumption" subtitle="Daily input and output tokens" style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="date" tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fill:'#506070', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${(v/1000).toFixed(1)}k`, '']}/>
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}/>
              <Bar dataKey="input"  fill="rgba(0, 212, 255, 0.7)" name="Input tokens"  radius={[3,3,0,0]}/>
              <Bar dataKey="output" fill="rgba(91, 156, 246, 0.7)" name="Output tokens" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Inference logs table ──────────────────────────────────── */}
        <LogsTable logs={logs} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function KpiCard({ icon, label, value, change, positive }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '16px',
      transition: 'border-color 0.2s', animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: positive ? 'var(--success)' : 'var(--error)',
          background: positive ? 'rgba(0,201,122,0.1)' : 'rgba(255,77,106,0.1)',
          padding: '2px 7px', borderRadius: 20,
        }}>{change}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 3 }}>{value ?? '–'}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', ...style,
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function LogsTable({ logs }) {
  const demoLogs = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    provider:     ['openai', 'gemini', 'groq'][i % 3],
    model:        ['gpt-4.1', 'gemini-2.0-flash', 'llama-3.3-70b-versatile'][i % 3],
    latencyMs:    Math.floor(300 + Math.random() * 1400),
    inputTokens:  Math.floor(80  + Math.random() * 500),
    outputTokens: Math.floor(40  + Math.random() * 400),
    status:       Math.random() > 0.08 ? 'success' : 'error',
    timestamp:    new Date(Date.now() - i * 180000).toISOString(),
    inputPreview: 'Explain the concept of...',
  }));

  const data = logs.length ? logs : demoLogs;
  const cols = ['Timestamp', 'Provider', 'Model', 'Latency', 'In Tokens', 'Out Tokens', 'Preview', 'Status'];

  return (
    <ChartCard title="Recent Inference Logs" subtitle="Last LLM API calls with full metadata — PII redacted before storage">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  textAlign: 'left', padding: '8px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', fontWeight: 500, fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((log, i) => (
              <tr key={log.id ?? i}
                style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PROVIDER_COLORS[log.provider] || '#888' }}/>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{log.provider}</span>
                  </div>
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '11px' }}>{log.model}</td>
                <td style={{ padding: '9px 12px', color: (log.latencyMs || log.latency_ms) > 1000 ? 'var(--warning)' : 'var(--text-primary)', fontWeight: 500 }}>
                  {log.latencyMs || log.latency_ms || '–'}ms
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{log.inputTokens  || log.input_tokens  || '–'}</td>
                <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{log.outputTokens || log.output_tokens || '–'}</td>
                <td style={{ padding: '9px 12px', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.inputPreview || '—'}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: '11px', fontWeight: 500,
                    background: log.status === 'success' ? 'rgba(0,201,122,0.1)' : 'rgba(255,77,106,0.1)',
                    color: log.status === 'success' ? 'var(--success)' : 'var(--error)',
                  }}>{log.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function formatTokens(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}