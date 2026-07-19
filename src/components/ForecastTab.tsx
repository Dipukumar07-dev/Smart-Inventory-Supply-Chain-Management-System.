import React, { useState } from 'react';
import { ForecastItem } from '../types.ts';
import { 
  Sparkles, TrendingUp, ShieldAlert, CheckCircle2, Clock, 
  AlertTriangle, Play, RefreshCw, BarChart2, Zap
} from 'lucide-react';

interface ForecastTabProps {
  token: string | null;
  onRefreshStats: () => void;
}

export default function ForecastTab({ token, onRefreshStats }: ForecastTabProps) {
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunForecast = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setForecasts(data.forecasts || []);
        setIsSimulated(data.isSimulated || false);
        onRefreshStats(); // Sync other stats
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to compile demand forecast.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the predictive backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold font-sans">Predictive Turnover</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Demand Forecasting</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Run predictive AI modeling using historical sales volume, stock turnover, and category velocity.</p>
        </div>
        <button
          onClick={handleRunForecast}
          disabled={loading}
          className="flex items-center gap-2 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 disabled:opacity-50 transition-colors rounded-none"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Calculating Projections...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Analyze & Run Forecast
            </>
          )}
        </button>
      </div>

      {/* Info notification */}
      {isSimulated && (
        <div className="border border-amber-600/30 bg-amber-50/50 p-5 rounded-none font-sans text-xs text-[#1A1A1A] flex items-start gap-3">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <strong className="block font-sans text-[10px] uppercase tracking-wider text-amber-900 font-bold">Demo Simulation Mode Active</strong>
            <span className="text-[#1A1A1A]/80 mt-1 block leading-relaxed">
              FlowChain is analyzing localized trends using the database transactions history. Connect your real Google Gemini API Key in the workspace secrets panel to activate full-scale natural language predictions and strategic warehouse forecasts!
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-600/30 bg-red-50 p-4 font-sans text-xs text-red-800 rounded-none flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Panel */}
      {forecasts.length === 0 && !loading ? (
        <div className="border border-dashed border-black/20 bg-white py-16 text-center max-w-4xl mx-auto px-8 rounded-none">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-none bg-[#F2F1EE] text-black">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Predictive Inventory Engine Is Dormant</h3>
          <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1.5 max-w-md mx-auto leading-relaxed">
            To view estimated sales turnover, days-of-stock left, and AI safety margin recommendations, initiate a prediction run.
          </p>
          <button
            onClick={handleRunForecast}
            className="mt-6 inline-flex items-center gap-1.5 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 transition-colors rounded-none"
          >
            <Play className="h-3.5 w-3.5" />
            Compile Initial Forecast
          </button>
        </div>
      ) : loading ? (
        <div className="border border-black/15 bg-white p-8 rounded-none">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin border-4 border-black border-t-transparent mb-4" />
            <h4 className="font-serif italic text-lg text-[#1A1A1A]">Querying Gemini Predictive Model...</h4>
            <p className="font-sans text-[10px] uppercase tracking-wider text-[#1A1A1A]/50 mt-1">Analyzing SKU lead times and inbound replenishment loops.</p>
          </div>
        </div>
      ) : (
        <div className="border border-black/15 bg-white rounded-none">
          <div className="border-b border-black/15 bg-[#F2F1EE]/30 px-6 py-4">
            <h3 className="font-serif italic font-semibold text-lg text-[#1A1A1A]">30-Day SKU Velocity Projections</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-black/15 bg-[#F2F1EE]/40 font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                  <th className="px-6 py-4">Product SKU</th>
                  <th className="px-6 py-4">Active Stock</th>
                  <th className="px-6 py-4">Est. Weekly Demand</th>
                  <th className="px-6 py-4">Stock Duration Left</th>
                  <th className="px-6 py-4">Safety Margin Status</th>
                  <th className="px-6 py-4 max-w-sm">Strategic AI Insights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 font-sans text-xs text-[#1A1A1A]">
                {forecasts.map(item => {
                  const outOfStock = item.currentQuantity === 0;
                  return (
                    <tr key={item.productId} className="hover:bg-[#F2F1EE]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-serif italic font-semibold text-[#1A1A1A]">{item.name}</div>
                        <div className="font-mono text-[10px] text-[#1A1A1A]/50 mt-0.5">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[#1A1A1A]">
                        {item.currentQuantity} units
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-[#1A1A1A]">
                        ~{item.estimatedWeeklyDemand} units / wk
                      </td>
                      <td className="px-6 py-4">
                        {outOfStock ? (
                          <span className="font-mono font-bold text-red-600 block uppercase text-[11px]">0 Days (Stockout)</span>
                        ) : (
                          <>
                            <span className={`font-mono font-bold text-xs block ${
                              item.daysOfStockRemaining < 10 ? 'text-red-600' : item.daysOfStockRemaining < 25 ? 'text-amber-600' : 'text-[#1A1A1A]'
                            }`}>
                              {item.daysOfStockRemaining} Days
                            </span>
                            <span className="text-[10px] text-[#1A1A1A]/50">Remaining stock timeline</span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none ${
                          item.status === "Critical restock" || outOfStock
                            ? "bg-red-50 text-red-700 border-red-200"
                            : item.status === "Moderate"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-[#7C8363]/10 text-[#7C8363] border-[#7C8363]/40"
                        }`}>
                          {item.status === "Critical restock" || outOfStock ? (
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                          ) : item.status === "Moderate" ? (
                            <Clock className="h-3 w-3 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          )}
                          {outOfStock ? "STOCKED OUT" : item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#1A1A1A]/80 max-w-sm leading-relaxed text-[11px] font-sans">
                        {item.aiReasoning}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
