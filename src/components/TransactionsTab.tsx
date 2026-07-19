import React, { useState } from 'react';
import { Transaction, Product } from '../types.ts';
import { 
  Plus, Search, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, 
  Settings, User, Clock, ArrowRightLeft, Database, AlertCircle
} from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  token: string | null;
}

export default function TransactionsTab({ transactions, products, loading, onRefresh, token }: TransactionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Form states
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'Inbound' | 'Outbound'>('Inbound');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openLogModal = () => {
    setProductId(products[0]?.id.toString() || '');
    setType('Inbound');
    setQuantity('10');
    setReason('');
    setErrorMsg(null);
    setLogModalOpen(true);
  };

  const handleLogTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Quantity must be a valid positive integer");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          productId: parseInt(productId),
          type,
          quantity: qty,
          reason,
        }),
      });

      if (response.ok) {
        setLogModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to log inventory transaction.");
      }
    } catch (err) {
      setErrorMsg("Could not connect to database server.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTx = transactions.filter(tx => {
    const matchesSearch = tx.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.productSku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold font-sans">Audit Ledger</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Stock Movement Logs</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Real-time audit trails of all warehouse inbound receiving and outbound dispatch orders.</p>
        </div>
        <button
          onClick={openLogModal}
          className="flex items-center gap-2 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 transition-colors rounded-none"
        >
          <Plus className="h-4 w-4" />
          Log Cargo Movement
        </button>
      </div>

      {/* Filters block */}
      <div className="flex flex-col gap-4 border border-black/15 bg-white p-5 rounded-none sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-4 h-4 w-4 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Search movements by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-black/15 bg-[#F2F1EE]/30 py-2.5 pr-4 pl-11 font-sans text-xs outline-none transition-all placeholder:text-[#1A1A1A]/40 focus:border-black focus:bg-white rounded-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-widest mr-1">Filter type:</span>
          {['All', 'Inbound', 'Outbound', 'Adjustment'].map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                typeFilter === f 
                  ? 'bg-black text-white' 
                  : 'bg-[#F2F1EE] text-[#1A1A1A]/70 hover:bg-[#B5B9A5]/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="border border-black/15 bg-white rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/15 bg-[#F2F1EE]/40 font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Product Name & SKU</th>
                <th className="px-6 py-4">Movement Type</th>
                <th className="px-6 py-4">Units Adjusted</th>
                <th className="px-6 py-4">Fulfillment Reason</th>
                <th className="px-6 py-4">Operator Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans text-xs text-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#1A1A1A]/60">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
                      <span className="font-sans text-[10px] uppercase tracking-wider font-bold">Fetching inventory audit trailing...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-serif italic text-sm text-[#1A1A1A]/50">
                    No matching movements logged in database logs.
                  </td>
                </tr>
              ) : (
                filteredTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#F2F1EE]/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-[#1A1A1A]/50 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-serif italic font-semibold text-[#1A1A1A]">{tx.productName}</div>
                      <div className="font-mono text-[10px] text-[#1A1A1A]/50 mt-0.5">{tx.productSku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none ${
                        tx.type === "Inbound" 
                          ? "bg-[#7C8363]/10 text-[#7C8363] border-[#7C8363]/40" 
                          : tx.type === "Outbound" 
                          ? "bg-amber-50 text-amber-800 border-amber-200" 
                          : "bg-[#F2F1EE] text-[#1A1A1A]/70 border-black/10"
                      }`}>
                        {tx.type === "Inbound" ? (
                          <ArrowDownLeft className="h-3 w-3 text-[#7C8363]" />
                        ) : tx.type === "Outbound" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-amber-700" />
                        ) : (
                          <ArrowRightLeft className="h-3.5 w-3.5 text-black/60" />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#1A1A1A] text-xs">
                      {tx.type === "Outbound" ? "-" : "+"}{tx.quantity} units
                    </td>
                    <td className="px-6 py-4 text-[#1A1A1A]/70">
                      {tx.reason || <span className="italic text-[#1A1A1A]/40">No comment listed</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-[#1A1A1A]/50">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-black/30" />
                        {tx.performedBy}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cargo log Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleLogTransaction} className="w-full max-w-md border border-black bg-[#FDFCFB] p-8 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-black" />
                <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Log Cargo Movement</h3>
              </div>
              <button type="button" onClick={() => setLogModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            {errorMsg && (
              <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Select Product SKU</label>
                <select
                  value={productId} onChange={(e) => setProductId(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2.5 outline-none bg-white focus:border-black rounded-none text-xs"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) - In Stock: {p.quantity}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Movement Type</label>
                  <select
                    value={type} onChange={(e) => setType(e.target.value as any)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2.5 outline-none bg-white focus:border-black rounded-none text-xs"
                  >
                    <option value="Inbound">Inbound (Receive cargo)</option>
                    <option value="Outbound">Outbound (Dispatch / Sale)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Operation Quantity</label>
                  <input
                    type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Movement Reason / Comments</label>
                <input
                  type="text" required placeholder="e.g. Sales Order #1043, Restocking apex order" value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                />
              </div>
            </div>

            <div className="border-t border-black/10 pt-5 mt-6 flex justify-end gap-2.5">
              <button
                type="button" onClick={() => setLogModalOpen(false)}
                className="border border-black/15 px-5 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="bg-black text-white px-6 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider hover:bg-black/80 disabled:opacity-50 rounded-none"
              >
                {submitting ? "Processing..." : "Commit Transaction"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
