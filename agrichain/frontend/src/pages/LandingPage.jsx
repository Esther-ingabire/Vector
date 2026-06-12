import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle, AlertTriangle,
  Thermometer, TrendingDown, Zap,
  Database, LineChart, Eye, LayoutDashboard,
  MapPin, BarChart2,
} from 'lucide-react'
import ChainSightLogo from '../components/ui/ChainSightLogo.jsx'
import RwandaSupplyMap from '../components/map/RwandaSupplyMap.jsx'

const CAPABILITIES = [
  {
    Icon: Database,
    title: 'Integrated supply chain data',
    body: 'Production, storage, transport and market data flow into one unified dataset — giving every stakeholder a single source of truth.',
  },
  {
    Icon: LineChart,
    title: 'Predictive loss analytics',
    body: 'Machine learning models score each batch for loss risk based on route, crop, transit time and historical patterns — before losses occur.',
  },
  {
    Icon: Eye,
    title: 'End-to-end traceability',
    body: 'Every batch moves through the chain with a unique identifier. Each handover is GPS-verified, timestamped and permanently recorded.',
  },
  {
    Icon: LayoutDashboard,
    title: 'Decision-support dashboards',
    body: 'District-level KPIs, loss trends and route performance presented visually — giving cooperatives, distributors and MINAGRI the data to act.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans antialiased bg-white text-gray-900">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-[1000] h-16">
        <div className="absolute inset-0 bg-primary-900/90 backdrop-blur-md border-b border-white/10" />
        <div className="relative h-full px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <ChainSightLogo size={32} className="logo-hover-spin" />
            <span className="font-extrabold text-white text-lg tracking-tight">ChainSight</span>
          </Link>

          {/* Centre nav links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#about"     className="text-white/55 hover:text-white transition-colors">About</a>
            <a href="#platform"  className="text-white/55 hover:text-white transition-colors">Platform</a>
            <a href="#analytics" className="text-white/55 hover:text-white transition-colors">Analytics</a>
            <a href="#access"    className="text-white/55 hover:text-white transition-colors">Access</a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/login"
              className="hidden sm:inline-flex h-9 px-5 rounded-lg text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all">
              Sign in
            </Link>
            <Link to="/request-access"
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white shadow transition-all">
              Request access <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[700px] overflow-hidden">

        {/* Map fills the full section */}
        <div className="absolute inset-0">
          <RwandaSupplyMap />
        </div>

        {/* Left-to-right gradient: solid dark green → transparent */}
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 500,
          background: 'linear-gradient(100deg, #0b2b18 0%, #0b2b18 18%, rgba(11,43,24,0.93) 36%, rgba(11,43,24,0.52) 54%, rgba(11,43,24,0.06) 72%, transparent 84%)',
        }} />
        {/* Top and bottom fades blend with nav / next section */}
        <div className="absolute inset-x-0 top-0 h-20 pointer-events-none"
          style={{ zIndex: 501, background: 'linear-gradient(to bottom, #0b2b18, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ zIndex: 501, background: 'linear-gradient(to top, #0b2b18, transparent)' }} />

        {/* Hero copy — vertically centred in the left panel */}
        <div className="absolute inset-0 flex flex-col justify-center" style={{ zIndex: 600 }}>
          <div className="px-8 lg:px-16 pt-16 max-w-[540px]">

            {/* Subtle category label — no pill, just clean text */}
            <p className="text-primary-400 text-xs font-bold tracking-[0.2em] uppercase mb-10">
              Rwanda · MINAGRI · RAB
            </p>

            {/* Headline — large, tight, confident */}
            <h1 className="font-black text-white tracking-tight leading-none mb-7"
              style={{ fontSize: 'clamp(3rem, 5.5vw, 5rem)' }}>
              Supply chain<br />
              analytics<br />
              <span className="text-primary-400">for Rwanda.</span>
            </h1>

            {/* One clear sentence */}
            <p className="text-white/50 text-base leading-relaxed mb-10"
              style={{ maxWidth: '22rem' }}>
              Integrating data from production, storage, transport and market distribution to reduce post-harvest losses and support data-driven agricultural decisions.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 mb-8">
              <Link to="/login"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary-400 hover:bg-primary-300 text-primary-900 font-black text-sm shadow-lg transition-all">
                Sign in <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/request-access"
                className="inline-flex items-center h-12 px-8 rounded-xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                Request access
              </Link>
            </div>

            {/* Map legend — inline, below the buttons, no collision */}
            <div className="flex items-center gap-5">
              <span className="text-white/25 text-[10px] font-bold uppercase tracking-[0.18em]">Loss risk</span>
              {[['#228b52','Low'],['#C55A11','Medium'],['#C00000','High']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-[11px] text-white/45 font-medium">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip — sits just below the hero ── */}
      <section className="bg-primary-900 border-t border-white/5">
        <div className="px-8 lg:px-16 py-10 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { v:'≤ 40%', l:'Post-harvest loss\nin perishables', danger: true },
            { v:'30',    l:'Districts\nintegrated' },
            { v:'5',     l:'Supply chain\nstages tracked' },
            { v:'100%',  l:'Batches\ntraced end-to-end' },
          ].map(s => (
            <div key={s.l} className="text-center sm:text-left">
              <div className={`text-3xl font-black leading-none mb-1.5 ${s.danger ? 'text-danger-500' : 'text-primary-400'}`}>{s.v}</div>
              <div className="text-xs text-white/35 font-medium leading-snug whitespace-pre-line">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-primary-900 py-20">
        <div className="px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-4">The challenge</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              Losses happen because no one can see where or why.
            </h2>
          </div>
          <div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Agricultural supply chains in Rwanda experience significant post-harvest losses caused by delays, improper storage and poor coordination between stakeholders. Without data connecting each stage of the chain, these losses cannot be identified, attributed or prevented.
            </p>
            <p className="text-white/50 text-sm leading-relaxed">
              ChainSight integrates data from production through to market distribution, applies predictive analytics to detect risk early, and delivers dashboards and reports that enable coordinated, data-driven responses.
            </p>
          </div>
        </div>
      </section>

      {/* ── Platform capabilities ── */}
      <section id="platform" className="bg-primary-900 py-24">
        <div className="px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Four core capabilities.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CAPABILITIES.map(cap => {
              const Icon = cap.Icon
              return (
                <div key={cap.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all">
                  <div className="w-10 h-10 bg-primary-700/60 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{cap.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{cap.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Analytics preview ── */}
      <section id="analytics" className="bg-primary-900 py-24">
        <div className="px-6 lg:px-12 max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-3">Intelligence engine</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Actionable intelligence, every morning.
            </h2>
            <p className="text-white/45 text-sm leading-relaxed">
              The system analyses supply chain data overnight and delivers a prioritised brief to the right decision-makers each day.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden max-w-2xl mx-auto">
            <div className="bg-white/8 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-700/60 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-300" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Daily Intelligence Brief — MINAGRI</p>
                  <p className="text-white/35 text-xs">Wednesday, 4 June 2026 · 06:00 EAT</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-primary-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" /> Live
              </span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-3 p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Route alert — Kigali → Rubavu</p>
                  <p className="text-xs text-white/45 mt-0.5">Loss rate up <span className="font-bold text-danger-500">+5.2%</span> over 7 days. 3 batches scored high-risk. Morning dispatch recommended.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3.5 bg-warning-500/10 border border-warning-500/20 rounded-xl">
                <Thermometer className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Cold-storage breach — Musanze facility</p>
                  <p className="text-xs text-white/45 mt-0.5">IoT sensor reported threshold breach at <span className="font-bold text-warning-500">3:14 AM</span>. Batch #CS-2406-0812 flagged for inspection.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3.5 bg-success-500/10 border border-success-500/20 rounded-xl">
                <TrendingDown className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">National loss rate improving</p>
                  <p className="text-xs text-white/45 mt-0.5">Average post-harvest loss fell to <span className="font-bold text-success-500">6.8%</span> — down 2.3 pp from Q1 2026.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Join ChainSight — benefit-led CTA ── */}
      <section id="access" className="bg-primary-900 py-24 border-t border-white/5">
        <div className="px-6 lg:px-12 max-w-5xl mx-auto text-center">

          <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-4">Join the platform</p>

          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Stop losing produce.<br />
            <span className="text-primary-400">Start gaining clarity.</span>
          </h2>

          <p className="text-white/50 text-base leading-relaxed mb-14 max-w-xl mx-auto">
            Whether you manage a cooperative, source and distribute produce or sell at an organised market —
            ChainSight connects every stage of the supply chain into one visible, traceable system.
          </p>

          {/* 3 benefit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14 text-left">
            {[
              {
                Icon: TrendingDown,
                title: 'Reduce post-harvest losses',
                body: 'Predictive models flag high-risk batches before spoilage occurs — giving your team time to act, reroute or intervene.',
              },
              {
                Icon: MapPin,
                title: 'Know where your produce is',
                body: 'Every batch is GPS-tracked and QR-traced through every handover. No more guesswork between cooperative and market.',
              },
              {
                Icon: BarChart2,
                title: 'Decisions backed by data',
                body: 'Daily intelligence briefs, district dashboards and exportable reports turn raw supply chain data into clear, actionable insight.',
              },
            ].map(b => {
              const BIcon = b.Icon
              return (
                <div key={b.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all">
                  <div className="w-11 h-11 bg-primary-700/60 rounded-xl flex items-center justify-center mb-5">
                    <BIcon className="w-5 h-5 text-primary-300" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{b.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{b.body}</p>
                </div>
              )
            })}
          </div>

          {/* Note on access + CTAs */}
          <p className="text-white/35 text-sm mb-7">
            Access is granted by a verified System Administrator following document review.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/request-access"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg transition-all">
              Request access <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center h-12 px-8 rounded-xl border border-white/25 text-white/70 font-semibold text-sm hover:border-white/50 hover:text-white transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-primary-900 py-20 text-center">
        <div className="px-6 max-w-lg mx-auto flex flex-col items-center">
          <ChainSightLogo size={48} className="logo-hover-spin mb-6" />
          <h2 className="text-3xl font-extrabold text-white mb-3">Rwanda's supply chain, finally visible.</h2>
          <p className="text-white/45 text-sm mb-8 leading-relaxed max-w-sm">
            Sign in if your account is ready, or request access to join the platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login"
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary-400 hover:bg-primary-300 text-primary-900 font-bold text-sm shadow transition-all">
              Sign in <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/request-access"
              className="inline-flex h-11 px-7 rounded-xl border border-white/25 text-white font-semibold text-sm items-center hover:bg-white/10 transition-all">
              Request access
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-primary-900 border-t border-white/10">
        <div className="px-6 lg:px-12 py-14 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <ChainSightLogo size={30} className="logo-hover-spin" />
              <span className="font-extrabold text-white text-base">ChainSight</span>
            </div>
            <p className="text-sm text-white/45 leading-relaxed mb-4">
              Supply chain data analytics for agricultural transparency and loss reduction — Rwanda.
            </p>
            <p className="text-xs text-white/30">
              Partner organisations: MINAGRI · RAB
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white/50 mb-5">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label:'Sign in',          to:'/login' },
                { label:'Request access',   to:'/request-access' },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/45 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Project */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white/50 mb-5">Institutions</h4>
            <ul className="space-y-2.5">
              {['Adventist University of Central Africa (AUCA)','Ministry of Agriculture (MINAGRI)','Rwanda Agriculture Board (RAB)','Agricultural Cooperatives'].map(t => (
                <li key={t} className="text-sm text-white/40">{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 lg:px-12 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">© 2026 ChainSight · Agricultural Supply Chain Analytics</p>
          <p className="text-xs text-white/30">Developed at AUCA · Rwanda</p>
        </div>
      </footer>

    </div>
  )
}
