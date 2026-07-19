import React, { useState } from 'react';
import { Product, Supplier } from '../types.ts';
import { 
  Plus, Search, Edit2, Trash2, MapPin, Check, X, ShieldAlert, Package
} from 'lucide-react';

interface ProductsTabProps {
  products: Product[];
  suppliers: Supplier[];
  loading: boolean;
  onRefresh: () => void;
  token: string | null;
}

export default function ProductsTab({ products, suppliers, loading, onRefresh, token }: ProductsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minThreshold, setMinThreshold] = useState('10');
  const [price, setPrice] = useState('0.00');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // Status message state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Adjustment states
  const [adjustingProductId, setAdjustingProductId] = useState<number | null>(null);
  const [adjustType, setAdjustType] = useState<'Inbound' | 'Outbound'>('Inbound');
  const [adjustQty, setAdjustQty] = useState('10');

  // Filter Categories
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Open modals with initialized values
  const openAddModal = () => {
    setName('');
    setSku(`SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setCategory('');
    setQuantity('0');
    setMinThreshold('10');
    setPrice('0.00');
    setSupplierId(suppliers[0]?.id.toString() || '');
    setDescription('');
    setLocation('');
    setErrorMsg(null);
    setAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setQuantity(p.quantity.toString());
    setMinThreshold(p.minThreshold.toString());
    setPrice(p.price);
    setSupplierId(p.supplierId?.toString() || '');
    setDescription(p.description || '');
    setLocation(p.location || '');
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name, sku, category, quantity, minThreshold, price, supplierId, description, location
        }),
      });
      if (response.ok) {
        setAddModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to create product");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name, sku, category, quantity, minThreshold, price, supplierId, description, location
        }),
      });
      if (response.ok) {
        setEditModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to update product");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product? All transaction history and reorders referencing this product may be impacted.")) return;
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("Failed to delete product");
      }
    } catch (err) {
      alert("Error contacting backend.");
    }
  };

  const handleQuickAdjust = async (productId: number) => {
    setErrorMsg(null);
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please specify a valid quantity greater than 0");
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
          productId,
          type: adjustType,
          quantity: qty,
          reason: `Manual Quick ${adjustType} Adjustment`,
        }),
      });

      if (response.ok) {
        setAdjustingProductId(null);
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to adjust inventory");
      }
    } catch (err) {
      alert("Failed to adjust inventory");
    }
  };

  // Filtered lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold font-sans">Active Ledger</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Products Catalogue</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Track and manage active warehouse stocks and manufacturer SKUs.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 transition-colors rounded-none"
        >
          <Plus className="h-4 w-4" />
          Add Product SKU
        </button>
      </div>

      {/* Controls: Search & Category filter */}
      <div className="flex flex-col gap-4 border border-black/15 bg-white p-5 rounded-none sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-3 left-4 h-4 w-4 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Search items by name, SKU identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-black/15 bg-[#F2F1EE]/30 py-2.5 pr-4 pl-11 font-sans text-xs outline-none transition-all placeholder:text-[#1A1A1A]/40 focus:border-black focus:bg-white rounded-none"
          />
        </div>
        {/* Category filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-widest mr-1">Filter:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                selectedCategory === cat 
                  ? 'bg-black text-white' 
                  : 'bg-[#F2F1EE] text-[#1A1A1A]/70 hover:bg-[#B5B9A5]/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="border border-black/15 bg-white rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/15 bg-[#F2F1EE]/40 font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                <th className="px-6 py-4">Product Name & SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Stock level</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Warehouse Bin</th>
                <th className="px-6 py-4">Main Supplier</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans text-xs text-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#1A1A1A]/60">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
                      <span className="font-sans text-[10px] uppercase tracking-wider font-bold">Fetching inventory items...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center font-serif italic text-sm text-[#1A1A1A]/50">
                    No matching products found. Try adjustments to search query.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isLow = p.quantity <= p.minThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-[#F2F1EE]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-serif italic font-semibold text-[#1A1A1A]">{p.name}</div>
                        <div className="font-mono text-[10px] text-[#1A1A1A]/50 mt-0.5">{p.sku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="border border-black/10 bg-[#F2F1EE] px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/80 rounded-none">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono font-bold text-xs ${isLow ? 'text-red-700 font-extrabold' : 'text-[#1A1A1A]'}`}>
                            {p.quantity} units
                          </span>
                          {isLow && (
                            <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 font-sans text-[8px] font-extrabold tracking-widest text-red-700 rounded-none">
                              <ShieldAlert className="h-3 w-3" />
                              DEFICIT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#1A1A1A]/50">Threshold limit: {p.minThreshold}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">
                        ₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-[#1A1A1A]/70">
                        <span className="flex items-center gap-1 font-sans text-[11px]">
                          <MapPin className="h-3.5 w-3.5 text-[#1A1A1A]/30" />
                          {p.location || <span className="italic text-[#1A1A1A]/40">Unassigned</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-serif italic text-sm text-[#1A1A1A]">
                          {p.supplierName || <span className="italic text-[#1A1A1A]/40">No Supplier Linked</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {adjustingProductId === p.id ? (
                            <div className="flex items-center gap-1 border border-black/25 bg-[#F2F1EE] p-1 rounded-none">
                              <select 
                                value={adjustType} 
                                onChange={(e) => setAdjustType(e.target.value as any)}
                                className="bg-transparent px-1 font-sans text-[10px] font-bold uppercase outline-none"
                              >
                                <option value="Inbound">IN</option>
                                <option value="Outbound">OUT</option>
                              </select>
                              <input 
                                type="number" 
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                className="w-10 bg-transparent px-1 font-mono text-[11px] font-bold outline-none text-center"
                              />
                              <button 
                                onClick={() => handleQuickAdjust(p.id)}
                                className="bg-black text-white p-0.5 rounded-none hover:bg-black/80"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={() => setAdjustingProductId(null)}
                                className="bg-transparent border border-black/15 p-0.5 rounded-none text-[#1A1A1A]/60"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAdjustingProductId(p.id);
                                setAdjustQty('10');
                                setAdjustType('Inbound');
                              }}
                              className="border border-black/15 bg-white px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none transition-all"
                            >
                              Quick Adjust
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-[#1A1A1A]/60 transition-colors hover:bg-[#F2F1EE] hover:text-black border border-transparent hover:border-black/10 rounded-none"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-[#1A1A1A]/60 transition-colors hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200/50 rounded-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Creation Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreate} className="w-full max-w-xl border border-black bg-[#FDFCFB] p-8 shadow-2xl flex flex-col max-h-[90vh] rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-black" />
                <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Add New Product SKU</h3>
              </div>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
              {errorMsg && (
                <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold">{errorMsg}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Product Name</label>
                  <input
                    type="text" required placeholder="e.g. Copper Pipe 1/2 inch" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">SKU identifier (Unique)</label>
                  <input
                    type="text" required value={sku} onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Category</label>
                  <input
                    type="text" required placeholder="Hardware, Electronics" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Initial Physical Stock</label>
                  <input
                    type="number" required min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Min stock Threshold</label>
                  <input
                    type="number" required min="0" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Unit Price (₹)</label>
                  <input
                    type="text" required placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Warehouse Storage Bin</label>
                  <input
                    type="text" placeholder="e.g. Aisle B, Shelf 4" value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Linked Supplier</label>
                  <select
                    value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none bg-white focus:border-black rounded-none"
                  >
                    <option value="">Select Primary Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Lead time: {s.leadTimeDays}d)</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Product Description</label>
                  <textarea
                    rows={2} placeholder="Optional notes regarding SKU packaging size etc." value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-black/10 pt-5 flex justify-end gap-2.5">
              <button
                type="button" onClick={() => setAddModalOpen(false)}
                className="border border-black/15 px-5 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="bg-black text-white px-6 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider hover:bg-black/80 disabled:opacity-50 rounded-none"
              >
                {submitting ? "Saving..." : "Add Product SKU"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Modal */}
      {editModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleUpdate} className="w-full max-w-xl border border-black bg-[#FDFCFB] p-8 shadow-2xl flex flex-col max-h-[90vh] rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-black" />
                <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Edit Product SKU</h3>
              </div>
              <button type="button" onClick={() => setEditModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
              {errorMsg && (
                <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold">{errorMsg}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Product Name</label>
                  <input
                    type="text" required placeholder="e.g. Copper Pipe 1/2 inch" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">SKU identifier (Unique)</label>
                  <input
                    type="text" required value={sku} onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Category</label>
                  <input
                    type="text" required placeholder="Hardware, Electronics" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Current Physical Stock</label>
                  <input
                    type="number" required min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Min stock Threshold</label>
                  <input
                    type="number" required min="0" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Unit Price (₹)</label>
                  <input
                    type="text" required placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-mono text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Warehouse Storage Bin</label>
                  <input
                    type="text" placeholder="e.g. Aisle B, Shelf 4" value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Linked Supplier</label>
                  <select
                    value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none bg-white focus:border-black rounded-none"
                  >
                    <option value="">Select Primary Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Lead time: {s.leadTimeDays}d)</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Product Description</label>
                  <textarea
                    rows={2} placeholder="Optional notes regarding SKU packaging size etc." value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 font-sans text-xs outline-none focus:border-black rounded-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-black/10 pt-5 flex justify-end gap-2.5">
              <button
                type="button" onClick={() => setEditModalOpen(false)}
                className="border border-black/15 px-5 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="bg-black text-white px-6 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider hover:bg-black/80 disabled:opacity-50 rounded-none"
              >
                {submitting ? "Saving changes..." : "Save Product SKU"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
