import React, { useState } from 'react';
import { DashboardData, Product } from '../types.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { 
  IndianRupee, Package2, ShieldAlert, 
  Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Truck
} from 'lucide-react';

interface DashboardTabProps {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  token: string | null;
}

// Refined Editorial Palette: charcoal, olive green, warm stone, deep slate
const COLORS = ['#1A1A1A', '#7C8363', '#9EA38B', '#4D513F', '#B5B9A5', '#333333'];

export default function DashboardTab({ data, loading, onRefresh, token }: DashboardTabProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportSimulated, setReportSimulated] = useState(false);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportModalOpen(true);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const resData = await response.json();
        setAiReport(resData.report);
        setReportSimulated(resData.isSimulated);
      } else {
        const err = await response.json();
        setAiReport(`### Generation Failed\n\n${err.error || "Please verify your server and database connection."}`);
      }
    } catch (err) {
      setAiReport("### System Error\n\nFailed to contact report generation endpoint.");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin border-2 border-black border-t-transparent" />
          <p className="font-sans text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/60">Recalculating ledger values...</p>
        </div>
      </div>
    );
  }

  const { summary, lowStockList, recentTransactions, categoryChart } = data;

  return (
    <div className="space-y-10">
      {/* Header section: Printed Newspaper Header Style */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold">Supply Intelligence</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Vantage Command Center</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Real-time valuation, safety stock alerts, and automated restock parameters.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 border border-black/15 bg-white px-4 py-2 font-sans font-bold text-[10px] text-[#1A1A1A] uppercase tracking-wider transition-all hover:bg-[#F2F1EE] rounded-none"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recalculate Ledger
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-1.5 bg-black px-4.5 py-2 font-sans font-bold text-[10px] text-white uppercase tracking-wider transition-all hover:bg-black/80 rounded-none"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#7C8363]" />
            Generate Health Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Flat Editorial Style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Valuation */}
        <div className="border border-black/15 bg-white p-6 rounded-none flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="font-sans font-bold text-[10px] text-[#1A1A1A]/55 uppercase tracking-widest">Inventory Assets</span>
            <IndianRupee className="h-4 w-4 text-[#1A1A1A]/40" />
          </div>
          <div className="mt-4">
            <h3 className="font-serif text-3xl font-normal text-[#1A1A1A]">
              ₹{summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="mt-1.5 font-sans text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-semibold">Cumulative Net Valuation</p>
          </div>
        </div>

        {/* Card 2: Total Units */}
        <div className="border border-black/15 bg-white p-6 rounded-none flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="font-sans font-bold text-[10px] text-[#1A1A1A]/55 uppercase tracking-widest">In-Store Volume</span>
            <Package2 className="h-4 w-4 text-[#1A1A1A]/40" />
          </div>
          <div className="mt-4">
            <h3 className="font-serif text-3xl font-normal text-[#1A1A1A]">
              {summary.totalStock.toLocaleString()}
            </h3>
            <p className="mt-1.5 font-sans text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-semibold">Available Units on Hand</p>
          </div>
        </div>

        {/* Card 3: Stock alerts */}
        <div className="border border-black/15 bg-white p-6 rounded-none flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="font-sans font-bold text-[10px] text-[#1A1A1A]/55 uppercase tracking-widest">Deficit Thresholds</span>
            <ShieldAlert className="h-4 w-4 text-[#1A1A1A]/40" />
          </div>
          <div className="mt-4">
            <h3 className={`font-serif text-3xl font-normal ${summary.lowStockCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {summary.lowStockCount}
            </h3>
            <p className="mt-1.5 font-sans text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-semibold">Lines Requiring Reorder</p>
          </div>
        </div>

        {/* Card 4: Supplier POs */}
        <div className="border border-black/15 bg-white p-6 rounded-none flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="font-sans font-bold text-[10px] text-[#1A1A1A]/55 uppercase tracking-widest">Open Shipments</span>
            <Truck className="h-4 w-4 text-[#1A1A1A]/40" />
          </div>
          <div className="mt-4">
            <h3 className="font-serif text-3xl font-normal text-[#1A1A1A]">
              {summary.pendingPOsCount}
            </h3>
            <p className="mt-1.5 font-sans text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-semibold">Outstanding Reorder Loops</p>
          </div>
        </div>
      </div>

      {/* Primary Panels: Alerts vs Visual Charts */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Low Stock Alerts (Left Column: structured listicle) */}
        <div className="flex flex-col border border-black/15 bg-white rounded-none lg:col-span-5">
          <div className="border-b border-black/15 px-6 py-4 bg-[#F2F1EE]">
            <h3 className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest text-[11px] text-[#1A1A1A]">
              <AlertTriangle className="h-4 w-4 text-[#7C8363]" />
              Critical Deficit Ledger
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 max-h-[400px] space-y-4 divide-y divide-black/10">
            {lowStockList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                <CheckCircle2 className="h-8 w-8 text-[#7C8363] mb-2" />
                <p className="font-serif text-lg italic text-[#1A1A1A]">Balanced Inventory Status</p>
                <p className="font-sans text-[10px] text-[#1A1A1A]/60 mt-1 uppercase tracking-wider">All active SKUs exceed safety parameters.</p>
              </div>
            ) : (
              lowStockList.map((item, idx) => (
                <div key={item.id} className={`flex items-start justify-between ${idx > 0 ? 'pt-4' : ''}`}>
                  <div>
                    <h4 className="font-serif text-base italic font-semibold text-[#1A1A1A]">{item.name}</h4>
                    <p className="font-mono text-[10px] text-[#1A1A1A]/60 mt-0.5">{item.sku}</p>
                    <p className="font-sans text-[10px] text-[#1A1A1A]/50 mt-1 uppercase tracking-wider">Warehouse Zone: {item.location || "Central Bay"}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-lg font-bold text-red-700 block">{item.quantity} Units Left</span>
                    <span className="font-sans text-[9px] text-[#1A1A1A]/55 uppercase tracking-widest">Min. Limit: {item.minThreshold}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category charts (Right Column: Hero Visual) */}
        <div className="flex flex-col border border-black/15 bg-white rounded-none lg:col-span-7">
          <div className="border-b border-black/15 px-6 py-4 bg-[#F2F1EE]">
            <h3 className="font-sans font-bold uppercase tracking-widest text-[11px] text-[#1A1A1A]">
              Product Category Allocation & Net Value
            </h3>
          </div>
          <div className="flex-1 p-6 min-h-[320px] flex items-center justify-center">
            {categoryChart.length === 0 ? (
              <p className="font-serif text-sm italic text-[#1A1A1A]/60">No allocation details reported yet.</p>
            ) : (
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="1 4" stroke="rgba(26,26,26,0.15)" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: '#1A1A1A', fontSize: 10, fontWeight: 'bold', fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#1A1A1A', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#1A1A1A', border: 'none', color: '#FDFCFB', borderRadius: '0px' }}
                      labelStyle={{ color: '#9EA38B', fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase' }}
                      itemStyle={{ color: '#FDFCFB', fontSize: 11, fontFamily: 'sans-serif' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'sans-serif', paddingTop: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    <Bar name="Stock Count" dataKey="stock" fill="#1A1A1A" radius={[0, 0, 0, 0]} />
                    <Bar name="Value (₹)" dataKey="value" fill="#7C8363" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Sub-Section (Printed Ledger Style) */}
      <div className="border border-black/15 bg-white rounded-none">
        <div className="flex items-center justify-between border-b border-black/15 px-6 py-4 bg-[#F2F1EE]">
          <h3 className="font-sans font-bold uppercase tracking-widest text-[11px] text-[#1A1A1A]">Operations Ledger (Recent Movements)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/15 bg-[#F2F1EE]/30 font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Cargo Item</th>
                <th className="px-6 py-3.5">Flow Mode</th>
                <th className="px-6 py-3.5">Delta</th>
                <th className="px-6 py-3.5">Context / Memo</th>
                <th className="px-6 py-3.5">Authorized Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans text-xs text-[#1A1A1A]">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center font-serif text-sm italic text-[#1A1A1A]/50">
                    No active transactions logged.
                  </td>
                </tr>
              ) : (
                recentTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#F2F1EE]/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-[#1A1A1A]/50 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-serif italic font-semibold text-[#1A1A1A]">{tx.productName}</div>
                      <div className="font-mono text-[10px] text-[#1A1A1A]/60 mt-0.5">{tx.productSku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none ${
                        tx.type === "Inbound" 
                          ? "border-[#7C8363]/40 bg-[#7C8363]/10 text-[#7C8363]" 
                          : tx.type === "Outbound" 
                          ? "border-red-200 bg-red-50 text-red-700" 
                          : "border-black/15 bg-[#F2F1EE] text-[#1A1A1A]"
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {tx.type === "Outbound" ? "-" : "+"}{tx.quantity} units
                    </td>
                    <td className="px-6 py-4 text-[#1A1A1A]/80 font-serif italic">
                      {tx.reason || "Cargo shipment check"}
                    </td>
                    <td className="px-6 py-4 text-[#1A1A1A]/60 font-mono text-[11px]">
                      {tx.performedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Report Modal - High-contrast layout */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl border border-black/20 bg-[#FDFCFB] p-8 shadow-2xl flex flex-col max-h-[85vh] rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#7C8363]" />
                <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Strategic Intelligence Briefing</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 text-[#1A1A1A]/50 hover:text-[#1A1A1A] font-sans text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 pr-4 scrollbar-thin">
              {generatingReport ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-6">
                    <div className="h-10 w-10 animate-spin border-2 border-black border-t-transparent" />
                    <Sparkles className="absolute -right-2 -bottom-2 h-5 w-5 text-[#7C8363] animate-pulse" />
                  </div>
                  <p className="font-serif italic text-base text-[#1A1A1A]">Gemini model is compiling logistics assessment...</p>
                  <p className="font-sans text-[10px] uppercase tracking-wider text-[#1A1A1A]/50 mt-1 max-w-sm text-center">
                    Auditing total assets, category velocity, and low threshold exceptions.
                  </p>
                </div>
              ) : aiReport ? (
                <div className="font-serif text-sm text-[#1A1A1A] leading-relaxed space-y-4">
                  {reportSimulated && (
                    <div className="mb-6 border border-amber-600/20 bg-amber-50 p-4 text-xs text-amber-800 rounded-none font-sans flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                      <span><strong>DEMO ASSESSMENT ACTIVE:</strong> Providing offline strategic model calculations. Add your Gemini API Key for deep system analytics.</span>
                    </div>
                  )}
                  <div className="markdown-body prose max-w-none text-[#1A1A1A] font-serif">
                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <p className="font-serif italic text-sm text-[#1A1A1A]/60">Briefing compile failed.</p>
              )}
            </div>

            <div className="border-t border-black/15 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/50 text-[10px]">FlowChain Intelligence Div.</span>
              <button
                onClick={() => setReportModalOpen(false)}
                className="bg-black text-[#FDFCFB] px-6 py-2.5 font-sans font-bold uppercase tracking-widest text-[10px] hover:bg-black/80 transition-colors rounded-none w-full sm:w-auto"
              >
                Acknowledge & Archive Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

