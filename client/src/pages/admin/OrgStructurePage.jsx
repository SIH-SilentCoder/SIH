import { useState } from 'react';
import {
  ShieldCheck, Cpu, FileText, Headphones, CheckCircle2,
  ChevronRight, Layers, ShieldAlert,
  Server, Database, Languages, MessageSquare, AlertTriangle
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';

const WING_DATA = [
  {
    id: 'it',
    title: '1. IT & Technical Wing',
    headRole: 'CTO / Head of IT',
    headName: 'Vikramaditya Rao',
    icon: Cpu,
    color: 'from-blue-600 to-indigo-700',
    borderColor: 'border-blue-500/40',
    badgeColor: 'bg-blue-100 text-blue-900',
    stats: { teams: 2, staffCount: 42, uptime: '99.98%', activeTickets: 3 },
    teams: [
      {
        name: 'System Administrators',
        lead: 'Anil Deshmukh',
        icon: Server,
        tasks: ['Cloud infrastructure & load balancing', 'Server security patches', 'CI/CD deployment pipelines'],
      },
      {
        name: 'Developers & DBAs',
        lead: 'Priya Sharma',
        icon: Database,
        tasks: ['PostgreSQL & MongoDB cluster optimization', 'REST API & WebSockets tuning', 'Core portal feature releases'],
      },
    ],
  },
  {
    id: 'content',
    title: '2. Content Management Wing',
    headRole: 'Chief Content Director',
    headName: 'Smt. Sunita Narayan',
    icon: FileText,
    color: 'from-purple-600 to-violet-800',
    borderColor: 'border-purple-500/40',
    badgeColor: 'bg-purple-100 text-purple-900',
    stats: { teams: 2, staffCount: 28, languages: 14, publicationsToday: 12 },
    teams: [
      {
        name: 'Content Editors',
        lead: 'Rajesh Mukherjee',
        icon: FileText,
        tasks: ['Govt notifications & MSP rate circulars', 'Press releases & portal announcements', 'FAQ & Scheme documentation'],
      },
      {
        name: 'Translators',
        lead: 'Dr. Meenakshi Sundaram',
        icon: Languages,
        tasks: ['Multi-lingual localization (Hindi, Punjabi, MP, etc.)', 'Accessibility compliance', 'Regional voice & SMS templates'],
      },
    ],
  },
  {
    id: 'grievance',
    title: '3. Grievance Redressal Wing',
    headRole: 'Head Grievance Officer',
    headName: 'Shri R. K. Pillai',
    icon: Headphones,
    color: 'from-amber-600 to-orange-700',
    borderColor: 'border-amber-500/40',
    badgeColor: 'bg-amber-100 text-amber-900',
    stats: { teams: 2, staffCount: 65, avgResolutionTime: '4.2 hrs', openTickets: 18 },
    teams: [
      {
        name: 'Escalation Handlers',
        lead: 'Harpreet Kaur',
        icon: AlertTriangle,
        tasks: ['Level-2 & Level-3 officer dispute handling', 'Slot booking override requests', 'DBT payment disbursal hold investigations'],
      },
      {
        name: 'Helpdesk Leads',
        lead: 'Amitabh Sen',
        icon: MessageSquare,
        tasks: ['Toll-free helpline (1800-KISAN) monitoring', 'AI chatbot query training', 'Farmer registration support'],
      },
    ],
  },
  {
    id: 'security',
    title: '4. Compliance & Security Wing',
    headRole: 'Security & Compliance Head',
    headName: 'Col. Sanjeev Nair (Retd.)',
    icon: ShieldCheck,
    color: 'from-emerald-600 to-teal-800',
    borderColor: 'border-emerald-500/40',
    badgeColor: 'bg-emerald-100 text-emerald-900',
    stats: { teams: 2, staffCount: 19, securityScore: '98/100', auditsPassed: '100%' },
    teams: [
      {
        name: 'Security Auditors',
        lead: 'Varun Joshi',
        icon: ShieldAlert,
        tasks: ['Penetration testing & vulnerability scans', 'CERT-In compliance audits', 'Zero-trust network architecture'],
      },
      {
        name: 'Audit Officers',
        lead: 'Kavita Menon',
        icon: CheckCircle2,
        tasks: ['Immutable audit logs inspection', 'Aadhaar/KYC data privacy checks', 'Role-Based Access Control (RBAC) verification'],
      },
    ],
  },
];

const OrgStructurePage = () => {
  const [selectedWing, setSelectedWing] = useState(WING_DATA[0].id);

  const activeWing = WING_DATA.find((w) => w.id === selectedWing) || WING_DATA[0];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header Banner */}
        <div className="bg-gradient-to-r from-[#0b1329] via-[#111c38] to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full">
                Apex Portal Governance
              </span>
              <span className="text-xs text-slate-400">• Ministry of Agriculture &amp; Food Security</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Central Portal Administration Architecture
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Official organizational hierarchy for national procurement administration. Divided into 4 specialized executive wings under the Apex Lead.
            </p>
          </div>
          {/* Subtle watermark background decorative icon */}
          <Layers className="w-64 h-64 absolute -right-10 -bottom-10 text-white/5 pointer-events-none" />
        </div>

        {/* ── Visual Hierarchy Flowchart Diagram Container ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Executive Organizational Flowchart</h2>
              <p className="text-xs text-slate-500">Top-to-bottom central governance structure &amp; department wings</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Format: 16:9 Landscape Architecture
              </span>
            </div>
          </div>

          {/* 1. APEX NODE (Top Center) */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="w-full max-w-xl bg-gradient-to-br from-[#0b1329] to-[#1e293b] text-white p-5 rounded-2xl border-2 border-amber-400/60 shadow-xl text-center relative">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-0.5 rounded-full border border-amber-400/30">
                Top Level Authority
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                Central Portal Apex Administrator / Ministry Lead
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Cabinet Secretariat &amp; Ministry Nodal Apex Authority
              </p>
            </div>

            {/* Connecting Line Downward */}
            <div className="h-8 w-1 bg-blue-600 my-1 relative">
              <div className="absolute bottom-0 -left-1.5 w-4 h-4 border-b-2 border-r-2 border-blue-600 transform rotate-45" />
            </div>
          </div>

          {/* 2. FOUR HORIZONTAL WINGS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
            {WING_DATA.map((wing) => {
              const Icon = wing.icon;
              const isSelected = selectedWing === wing.id;

              return (
                <div
                  key={wing.id}
                  onClick={() => setSelectedWing(wing.id)}
                  className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `bg-white ${wing.borderColor} shadow-lg ring-2 ring-blue-500/20`
                      : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wing.color} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wing.badgeColor}`}>
                        Wing Leader
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-900 leading-tight">{wing.title}</h4>
                    
                    {/* Department Head */}
                    <div className="mt-3 p-3 bg-slate-100/80 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Department Head</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{wing.headRole}</p>
                      <p className="text-[11px] text-blue-700 font-semibold">{wing.headName}</p>
                    </div>

                    {/* Specialized Teams */}
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Specialized Teams</p>
                      {wing.teams.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Inspect Wing Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Wing Deep Inspection Panel ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeWing.color} text-white flex items-center justify-center shadow-md`}>
                <activeWing.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{activeWing.title} — Detailed Operations</h3>
                <p className="text-xs text-slate-500">Executive Head: <strong className="text-slate-900">{activeWing.headRole}</strong> ({activeWing.headName})</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(activeWing.stats).map(([key, val]) => (
                <div key={key} className="bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key}</p>
                  <p className="text-sm font-black text-slate-900">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teams Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeWing.teams.map((team, idx) => {
              const TeamIcon = team.icon;
              return (
                <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-white text-blue-700 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs">
                        <TeamIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{team.name}</h4>
                        <p className="text-xs text-slate-500">Team Lead: <span className="font-semibold text-slate-800">{team.lead}</span></p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full uppercase">
                      Active Unit
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Core Functional Mandates:</p>
                    <ul className="space-y-2">
                      {team.tasks.map((task, tIdx) => (
                        <li key={tIdx} className="text-xs text-slate-700 flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default OrgStructurePage;
