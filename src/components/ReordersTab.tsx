import React, { useState } from 'react';
import { PurchaseOrder, Supplier, Product } from '../types.ts';
import { 
  Plus, Calendar, Truck, Check, X, ClipboardList, AlertCircle, ShoppingCart
} from 'lucide-react';

interface ReordersTabProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  token: string | null;
}

export default function ReordersTab({ purchaseOrders, suppliers, products, loading, onRefresh, token }: ReordersTabProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('50');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setSupplierId(suppliers[0]?.id.toString() || '');
    setProductId(products[0]?.id.toString() || '');
    setQuantity('50');
    setErrorMsg(null);
    setAddModalOpen(true);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Quantity must be a valid positive integer");
      setSubmitting(false);
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === parseInt(supplierId));

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          supplierId: parseInt(supplierId),
          productId: parseInt(productId),
          quantity: qty,
          leadTimeDays: selectedSupplier?.leadTimeDays || 7,
        }),
      });

      if (response.ok) {
        setAddModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to issue purchase order");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the reordering server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'Ordered' | 'Received' | 'Cancelled') => {
    const confirmationMsg = status === 'Received' 
      ? "Mark as Received? This will automatically ADD the ordered quantity to the active warehouse stock and log an inbound transaction."
      : `Are you sure you want to change status to ${status}?`;

    if (!window.confirm(confirmationMsg)) return;

    try {
      const response = await fetch(`/api/purchase-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update order status");
      }
    } catch (err) {
      alert("Error contacting the backend database.");
    }
  };

  // Filter products by selected supplier to make the form intelligent!
  const filteredProductsForSupplier = supplierId 
    ? products.filter(p => p.supplierId === parseInt(supplierId))
    : products;

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold font-sans">Shipment Ledger</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Purchase & Replenishment</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Draft, order, and track supplier inventory shipments and fulfillment loops.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 transition-colors rounded-none"
        >
          <Plus className="h-4 w-4" />
          Issue Purchase Order
        </button>
      </div>

      {/* Orders list table */}
      <div className="border border-black/15 bg-white rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/15 bg-[#F2F1EE]/40 font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                <th className="px-6 py-4">PO Reference</th>
                <th className="px-6 py-4">Manufacturer Partner</th>
                <th className="px-6 py-4">Ordered SKU</th>
                <th className="px-6 py-4">Fulfillment Status</th>
                <th className="px-6 py-4">Shipping Milestones</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans text-xs text-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#1A1A1A]/60">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
                      <span className="font-sans text-[10px] uppercase tracking-wider font-bold">Fetching active orders logs...</span>
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-serif italic text-sm text-[#1A1A1A]/50 bg-white">
                    No active reorders outstanding. Click "Issue Purchase Order" to replenish stock levels.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map(po => {
                  return (
                    <tr key={po.id} className="hover:bg-[#F2F1EE]/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">
                        PO-#00{po.id}
                      </td>
                      <td className="px-6 py-4 font-serif italic text-sm text-[#1A1A1A]">
                        {po.supplierName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-serif italic font-semibold text-[#1A1A1A]">{po.productName}</div>
                        <div className="font-mono text-[10px] text-[#1A1A1A]/50 mt-0.5">{po.productSku}</div>
                        <div className="font-sans text-[10px] text-[#1A1A1A]/50 mt-1">Quantity: <strong className="text-[#1A1A1A]">{po.quantity}</strong> units</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none ${
                          po.status === "Received" 
                            ? "bg-[#7C8363]/10 text-[#7C8363] border-[#7C8363]/40" 
                            : po.status === "Ordered"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : po.status === "Cancelled"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-[#F2F1EE] text-[#1A1A1A]/70 border-black/10"
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-y-1 text-[#1A1A1A]/70">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-black/30" />
                          <span>Ordered: <strong className="font-mono">{new Date(po.orderDate).toLocaleDateString()}</strong></span>
                        </div>
                        {po.expectedDeliveryDate && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Truck className="h-3.5 w-3.5 text-black/30" />
                            <span>Est. Delivery: <strong className="font-mono">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</strong></span>
                          </div>
                        )}
                        {po.actualDeliveryDate && (
                          <div className="flex items-center gap-1 text-[11px] text-[#7C8363] font-medium">
                            <Check className="h-3.5 w-3.5" />
                            <span>Received: <strong className="font-mono">{new Date(po.actualDeliveryDate).toLocaleDateString()}</strong></span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {po.status === "Pending" && (
                            <button
                              onClick={() => handleUpdateStatus(po.id, "Ordered")}
                              className="bg-black text-white hover:bg-black/80 px-3 py-1.5 font-sans font-bold text-[9px] uppercase tracking-wider rounded-none"
                            >
                              Dispatch Order
                            </button>
                          )}
                          {(po.status === "Pending" || po.status === "Ordered") && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(po.id, "Received")}
                                className="bg-[#7C8363] text-white hover:bg-[#7C8363]/80 px-3 py-1.5 font-sans font-bold text-[9px] uppercase tracking-wider rounded-none"
                              >
                                Mark Received
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(po.id, "Cancelled")}
                                className="border border-red-200 bg-white px-2.5 py-1.5 font-sans font-bold text-[9px] uppercase tracking-wider text-red-700 hover:bg-red-50 rounded-none"
                              >
                                Cancel PO
                              </button>
                            </>
                          )}
                          {po.status === "Received" && (
                            <span className="font-sans text-[10px] text-[#7C8363] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Check className="h-4 w-4" /> Fulfilled
                            </span>
                          )}
                          {po.status === "Cancelled" && (
                            <span className="font-sans text-[10px] text-red-500 font-bold uppercase tracking-wider italic">
                              Voided
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issuing purchase order Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreatePO} className="w-full max-w-md border border-black bg-[#FDFCFB] p-8 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4 mb-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-black" />
                <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Issue Purchase Order</h3>
              </div>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            {errorMsg && (
              <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">1. Choose Supplier Partner</label>
                <select
                  value={supplierId} onChange={(e) => {
                    setSupplierId(e.target.value);
                    // Autofill with the first product matching the selected supplier
                    const firstMatching = products.find(p => p.supplierId === parseInt(e.target.value));
                    setProductId(firstMatching?.id.toString() || products[0]?.id.toString() || '');
                  }}
                  className="w-full border border-black/15 bg-white px-3.5 py-2.5 outline-none bg-white focus:border-black rounded-none text-xs"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Delivery Time: {s.leadTimeDays}d)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">2. Choose SKU to Replenish</label>
                <select
                  value={productId} onChange={(e) => setProductId(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2.5 outline-none bg-white focus:border-black rounded-none text-xs"
                >
                  {filteredProductsForSupplier.length > 0 ? (
                    filteredProductsForSupplier.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Current: {p.quantity}</option>
                    ))
                  ) : (
                    <option value="">No products registered for this supplier</option>
                  )}
                </select>
                {filteredProductsForSupplier.length === 0 && supplierId && (
                  <p className="mt-1.5 text-[10px] text-red-700 font-bold tracking-wide uppercase">Notice: No SKUs are currently mapped to this supplier in the product catalogue.</p>
                )}
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">3. Reorder Quantity (Units)</label>
                <input
                  type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs font-mono"
                />
              </div>
            </div>

            <div className="border-t border-black/10 pt-5 mt-6 flex justify-end gap-2.5">
              <button
                type="button" onClick={() => setAddModalOpen(false)}
                className="border border-black/15 px-5 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting || !productId}
                className="bg-black text-white px-6 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider hover:bg-black/80 disabled:opacity-50 rounded-none"
              >
                {submitting ? "Issuing..." : "Issue Purchase Order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
