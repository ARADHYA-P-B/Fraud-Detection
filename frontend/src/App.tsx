import React, { useEffect, useState, useCallback } from "react";
import "../src/index.css"
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Lock,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  Eye,
  SlidersHorizontal,
  Radio,
  Fingerprint,
} from "lucide-react";
import { fraudApi } from "./services/api";
import type { FraudCase, AnalystActionType, RiskTier } from "./types/fraud";

export default function App() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);
  const [actionType, setActionType] = useState<AnalystActionType>("ESCALATE");
  const [notes, setNotes] = useState<string>("");
  const [lockAccount, setLockAccount] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [simulating, setSimulating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCases = useCallback(async () => {
    try {
      setError(null);
      const data = await fraudApi.getCases(0);
      setCases(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach Case Management API (Port 8001)"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 5000);
    return () => clearInterval(interval);
  }, [fetchCases]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setSubmitting(true);
    try {
      await fraudApi.submitCaseAction(selectedCase.user_id, {
        analyst_id: "anl_senior_01",
        action: actionType,
        notes:
          notes || `Action ${actionType} executed via Cyber-Prism Console.`,
        lock_account: lockAccount,
      });
      showToast(`Case ${selectedCase.user_id} updated → ${actionType}`);
      setSelectedCase(null);
      setNotes("");
      await fetchCases();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute decision");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerSimulatedAttack = async () => {
    setSimulating(true);
    const randomUser = `usr_${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      await fraudApi.simulateTelemetryEvent({
        event_id: `evt_${Date.now()}`,
        user_id: randomUser,
        session_id: `ses_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
        event_type: "LOAN_APPLICATION",
        ip_address: "198.51.100.42",
        device_id: "dev_emulator_99",
        is_vpn: true,
      });
      showToast(`Injected high-risk ATO payload for ${randomUser}`);
      setTimeout(fetchCases, 1200);
    } catch {
      showToast("Ingestion Service offline on Port 8000");
    } finally {
      setSimulating(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesTier = tierFilter === "ALL" || c.risk_tier === tierFilter;
    const matchesSearch =
      c.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.flagged_reason &&
        c.flagged_reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTier && matchesSearch;
  });

  const criticalCount = cases.filter((c) => c.risk_tier === "CRITICAL").length;
  const highCount = cases.filter((c) => c.risk_tier === "HIGH").length;
  const pendingCount = cases.filter(
    (c) => c.status === "PENDING_REVIEW"
  ).length;

  const getTierTheme = (tier: RiskTier) => {
    switch (tier) {
      case "CRITICAL":
        return {
          pill: "bg-gradient-to-r from-rose-500/25 via-fuchsia-500/20 to-orange-500/25 text-rose-200 border-rose-400/50 shadow-[0_0_16px_rgba(244,63,94,0.35)]",
          bar: "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400",
          dot: "bg-rose-400 animate-ping",
          scoreText: "text-rose-300",
        };
      case "HIGH":
        return {
          pill: "bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-200 border-amber-400/50 shadow-[0_0_14px_rgba(245,158,11,0.25)]",
          bar: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500",
          dot: "bg-amber-400",
          scoreText: "text-amber-300",
        };
      default:
        return {
          pill: "bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 text-emerald-200 border-emerald-400/50 shadow-[0_0_14px_rgba(16,185,129,0.2)]",
          bar: "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
          dot: "bg-emerald-400",
          scoreText: "text-emerald-300",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans relative overflow-x-hidden selection:bg-fuchsia-500/40 selection:text-white">
      {/* Multi-Color Aurora Ambient Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-violet-600/25 rounded-full blur-[130px]" />
        <div className="absolute top-10 right-[-5rem] w-[32rem] h-[32rem] bg-fuchsia-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-6rem] left-1/4 w-[36rem] h-[26rem] bg-cyan-500/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-20 right-1/4 w-[24rem] h-[24rem] bg-rose-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Rainbow Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 text-white px-5 py-3.5 rounded-2xl shadow-[0_12px_35px_rgba(217,70,239,0.5)] border border-white/25 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-200 shrink-0" />
          <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Glass Header with Rainbow Bottom Accent Line */}
      <header className="sticky top-0 z-30 bg-[#090E23]/80 backdrop-blur-2xl border-b border-white/10">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-violet-500 via-fuchsia-500 to-amber-400" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 shadow-[0_0_25px_rgba(139,92,246,0.5)]">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                  PRISM FRAUD SHIELD
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Stream Active
                </span>
              </div>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                Redis Real-Time Telemetry • Neural Velocity Scoring • SQLite Forensics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerSimulatedAttack}
              disabled={simulating}
              className="group flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold bg-gradient-to-r from-rose-500 via-fuchsia-600 to-amber-500 hover:from-rose-400 hover:via-fuchsia-500 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl transition-all shadow-[0_0_24px_rgba(244,63,94,0.45)] hover:shadow-[0_0_32px_rgba(217,70,239,0.65)] active:scale-95"
            >
              <Zap className="w-4 h-4 fill-amber-200 text-amber-200 group-hover:rotate-12 transition-transform" />
              {simulating ? "Injecting Payload..." : "Simulate ATO Attack"}
            </button>

            <button
              onClick={fetchCases}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 text-cyan-200 rounded-xl border border-cyan-400/30 transition active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
              Sync Feed
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-7">
        {/* 4 Vibrant Color-Coded Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Electric Violet */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-violet-400/50 via-indigo-500/20 to-transparent shadow-[0_10px_30px_rgba(124,58,237,0.2)]">
            <div className="h-full rounded-2xl p-5 bg-gradient-to-br from-[#141133] to-[#0A0E21]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-violet-300">
                    Total Flagged
                  </p>
                  <p className="text-4xl font-black bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent mt-2">
                    {cases.length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-violet-500/25 text-violet-300 border border-violet-400/30">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full rounded-full bg-violet-950 overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 2: Neon Crimson-Pink */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-rose-400/60 via-pink-500/20 to-transparent shadow-[0_10px_30px_rgba(244,63,94,0.25)]">
            <div className="h-full rounded-2xl p-5 bg-gradient-to-br from-[#2A0E1E] to-[#0A0E21]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
                    Critical Risk (≥80)
                  </p>
                  <p className="text-4xl font-black bg-gradient-to-r from-rose-200 via-pink-300 to-amber-200 bg-clip-text text-transparent mt-2">
                    {criticalCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/25 text-rose-300 border border-rose-400/30">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full rounded-full bg-rose-950 overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 3: Solar Amber-Orange */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-amber-400/60 via-orange-500/20 to-transparent shadow-[0_10px_30px_rgba(245,158,11,0.2)]">
            <div className="h-full rounded-2xl p-5 bg-gradient-to-br from-[#291B0C] to-[#0A0E21]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    High Velocity (50–79)
                  </p>
                  <p className="text-4xl font-black bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent mt-2">
                    {highCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/25 text-amber-300 border border-amber-400/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full rounded-full bg-amber-950 overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 4: Cyber Cyan-Emerald */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-cyan-400/60 via-teal-500/20 to-transparent shadow-[0_10px_30px_rgba(6,182,212,0.2)]">
            <div className="h-full rounded-2xl p-5 bg-gradient-to-br from-[#0B232E] to-[#0A0E21]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                    Pending Review
                  </p>
                  <p className="text-4xl font-black bg-gradient-to-r from-cyan-200 to-emerald-300 bg-clip-text text-transparent mt-2">
                    {pendingCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/25 text-cyan-300 border border-cyan-400/30">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full rounded-full bg-cyan-950 overflow-hidden">
                <div className="h-full w-3/5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Colorful Search & Glowing Pill Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0D132B]/90 backdrop-blur-xl p-4 rounded-2xl border border-indigo-500/25 shadow-xl">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-fuchsia-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Filter by User ID (e.g. usr_849201) or anomaly signature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#060918] border border-indigo-500/30 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <SlidersHorizontal className="w-4 h-4 text-indigo-300 mr-1 shrink-0" />
            {(["ALL", "CRITICAL", "HIGH", "LOW"] as const).map((tier) => {
              const pillGradients: Record<string, string> = {
                ALL: "bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(139,92,246,0.5)]",
                CRITICAL:
                  "bg-gradient-to-r from-rose-500 via-pink-600 to-orange-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.5)]",
                HIGH: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.45)]",
                LOW: "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.45)]",
              };

              return (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all ${
                    tierFilter === tier
                      ? pillGradients[tier]
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-r from-rose-950/90 via-fuchsia-950/80 to-red-900/70 border border-rose-400/50 text-rose-100 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm shadow-lg">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <span>
              <strong className="text-white">Connection Offline:</strong> {error}. Ensure{" "}
              <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">
                case-management
              </code>{" "}
              is running on Port 8001.
            </span>
          </div>
        )}

        {/* Iridescent Case Queue Table */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/30 to-amber-500/30 shadow-2xl">
          <div className="bg-[#090E22]/95 backdrop-blur-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-fuchsia-950/40 to-cyan-950/50 text-[11px] font-extrabold uppercase tracking-wider text-cyan-200">
                    <th className="py-4 px-5">Target Identity</th>
                    <th className="py-4 px-5">Threat Index</th>
                    <th className="py-4 px-5">Risk Tier</th>
                    <th className="py-4 px-5">Triggered Signals</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5">Updated</th>
                    <th className="py-4 px-5 text-right">Console</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-fuchsia-300 font-semibold animate-pulse"
                      >
                        Syncing live fraud stream...
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.25)]">
                          <ShieldCheck className="w-8 h-8 text-emerald-300" />
                        </div>
                        <p className="text-base font-bold text-white">
                          Perimeter Clear — Zero Active Threats
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click{" "}
                          <span className="text-fuchsia-400 font-bold">
                            "Simulate ATO Attack"
                          </span>{" "}
                          above to test real-time detection.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((fraudCase) => {
                      const theme = getTierTheme(fraudCase.risk_tier);
                      return (
                        <tr
                          key={fraudCase.user_id}
                          className="group hover:bg-gradient-to-r hover:from-cyan-500/[0.07] hover:via-fuchsia-500/[0.07] hover:to-amber-500/[0.05] transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                              <Fingerprint className="w-3.5 h-3.5 text-fuchsia-400" />
                              {fraudCase.user_id}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-black text-base w-9 ${theme.scoreText}`}
                              >
                                {fraudCase.risk_score.toFixed(0)}
                              </span>
                              <div className="w-24 h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                                  style={{
                                    width: `${Math.min(
                                      fraudCase.risk_score,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold border ${theme.pill}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${theme.dot}`}
                              />
                              {fraudCase.risk_tier}
                            </span>
                          </td>

                          <td className="py-4 px-5 max-w-md text-slate-200 text-xs leading-relaxed">
                            {fraudCase.flagged_reason}
                          </td>

                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-xl border ${
                                fraudCase.status === "ESCALATED"
                                  ? "bg-rose-500/20 text-rose-200 border-rose-400/40"
                                  : fraudCase.status === "DISMISSED"
                                  ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                                  : "bg-violet-500/20 text-violet-200 border-violet-400/40"
                              }`}
                            >
                              {fraudCase.status === "ESCALATED" && (
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              {fraudCase.status === "DISMISSED" && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              {fraudCase.status}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-xs text-indigo-200/70 font-mono">
                            {new Date(
                              fraudCase.updated_at
                            ).toLocaleTimeString()}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => {
                                setSelectedCase(fraudCase);
                                setActionType("ESCALATE");
                                setLockAccount(true);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white rounded-xl text-xs font-extrabold transition shadow-[0_4px_16px_rgba(168,85,247,0.4)] active:scale-95"
                            >
                              Investigate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Vibrant Cyber-Prism Disposition Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-[#03050D]/80 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="rounded-3xl p-[1.5px] bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-amber-400 max-w-lg w-full shadow-[0_0_60px_rgba(217,70,239,0.35)]">
            <div className="bg-gradient-to-b from-[#121938] to-[#090D20] rounded-3xl p-6 space-y-5">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">
                    Analyst Disposition Console
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                    Account:{" "}
                    <span className="font-mono text-cyan-300">
                      {selectedCase.user_id}
                    </span>
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/30 flex items-center justify-center text-slate-200 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="bg-gradient-to-r from-rose-500/15 via-fuchsia-500/15 to-amber-500/15 p-4 rounded-2xl border border-rose-400/30 text-xs text-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 uppercase font-extrabold tracking-wider">
                    Telemetry Trigger
                  </span>
                  <span className="font-black text-sm text-rose-300">
                    Score: {selectedCase.risk_score} / 100
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {selectedCase.flagged_reason}
                </p>
              </div>

              <form onSubmit={handleActionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-cyan-300 uppercase tracking-wider mb-2">
                    Disposition Verdict
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        "ESCALATE",
                        "INVESTIGATE",
                        "DISMISS",
                      ] as AnalystActionType[]
                    ).map((act) => {
                      const activeGradients: Record<AnalystActionType, string> =
                        {
                          ESCALATE:
                            "bg-gradient-to-r from-rose-500 via-pink-600 to-orange-500 shadow-[0_0_18px_rgba(244,63,94,0.5)]",
                          INVESTIGATE:
                            "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_18px_rgba(245,158,11,0.5)]",
                          DISMISS:
                            "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_0_18px_rgba(16,185,129,0.5)]",
                        };

                      return (
                        <button
                          type="button"
                          key={act}
                          onClick={() => {
                            setActionType(act);
                            setLockAccount(act === "ESCALATE");
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-black tracking-wider transition-all ${
                            actionType === act
                              ? `${activeGradients[act]} text-white scale-[1.03]`
                              : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {act}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-cyan-300 uppercase tracking-wider mb-1.5">
                    Forensic Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document device fingerprint mismatch, VPN ASN, or verification call..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#060918] border border-indigo-500/35 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
                  />
                </div>

                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-rose-500/15 to-amber-500/10 border border-rose-400/30 text-xs font-bold text-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockAccount}
                    onChange={(e) => setLockAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-rose-400 bg-slate-950 text-rose-500 focus:ring-rose-500"
                  />
                  <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    Immediately freeze user account & invalidate Redis sessions
                  </span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCase(null)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow-[0_0_24px_rgba(168,85,247,0.5)]"
                  >
                    {submitting ? "Committing..." : "Execute Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}