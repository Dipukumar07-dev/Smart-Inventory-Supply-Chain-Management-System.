import React, { useState } from 'react';
import { Supplier } from '../types.ts';
import { 
  Plus, Edit2, Trash2, Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle, Award
} from 'lucide-react';

interface SuppliersTabProps {
  suppliers: Supplier[];
  loading: boolean;
  onRefresh: () => void;
  token: string | null;
}

export default function SuppliersTab({ suppliers, loading, onRefresh, token }: SuppliersTabProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Preferred'>('Active');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setLeadTimeDays('7');
    setStatus('Active');
    setErrorMsg(null);
    setAddModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setSelectedSupplier(s);
    setName(s.name);
    setContactName(s.contactName || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setLeadTimeDays(s.leadTimeDays.toString());
    setStatus(s.status);
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name, contactName, email, phone, address, leadTimeDays, status
        }),
      });
      if (response.ok) {
        setAddModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to create supplier");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name, contactName, email, phone, address, leadTimeDays, status
        }),
      });
      if (response.ok) {
        setEditModalOpen(false);
        onRefresh();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || "Failed to update supplier");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this supplier? Any linked products will have their supplier references set to null.")) return;
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("Failed to delete supplier");
      }
    } catch (err) {
      alert("Error contacting backend.");
    }
  };

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-black/20 pb-6">
        <div>
          <span className="bg-black text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold font-sans">Strategic Partners</span>
          <h2 className="font-serif italic text-4xl font-semibold tracking-tight text-[#1A1A1A] mt-2">Suppliers & Manufacturers</h2>
          <p className="font-sans text-xs text-[#1A1A1A]/70 uppercase tracking-widest mt-1">Coordinate primary manufacturers, order lead times, and active statuses.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black px-5 py-3 font-sans font-bold text-[10px] text-white uppercase tracking-widest hover:bg-black/80 transition-colors rounded-none"
        >
          <Plus className="h-4 w-4" />
          Add Supplier Partner
        </button>
      </div>

      {/* Supplier Grid */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin border-2 border-black border-t-transparent" />
            <p className="font-sans text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">Loading manufacturers lists...</p>
          </div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="border border-dashed border-black/20 py-12 text-center font-serif italic text-sm text-[#1A1A1A]/60 bg-white rounded-none">
          No suppliers configured yet. Register a supply partner to begin linking inventory.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map(s => (
            <div key={s.id} className="flex flex-col border border-black/15 bg-white p-6 justify-between rounded-none shadow-none">
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-black/10 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">{s.name}</h3>
                    <p className="font-sans text-[11px] text-[#1A1A1A]/60 mt-0.5">Contact: {s.contactName || "None Spec."}</p>
                  </div>
                  <span className={`inline-flex items-center border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none ${
                    s.status === "Preferred" 
                      ? "bg-[#7C8363]/10 text-[#7C8363] border-[#7C8363]/45" 
                      : s.status === "Active" 
                      ? "bg-[#F2F1EE] text-[#1A1A1A]/70 border-black/10" 
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {s.status === "Preferred" && <Award className="h-3 w-3 mr-1" />}
                    {s.status}
                  </span>
                </div>

                {/* Details layout */}
                <div className="mt-4 space-y-3 font-sans text-xs text-[#1A1A1A]/80">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1A1A1A]/40 shrink-0" />
                    <span>Average Lead Time: <strong className="font-mono text-xs">{s.leadTimeDays} Days</strong></span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#1A1A1A]/40 shrink-0" />
                      <a href={`mailto:${s.email}`} className="text-black underline break-all font-mono text-[11px]">{s.email}</a>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#1A1A1A]/40 shrink-0" />
                      <span className="font-mono text-[11px]">{s.phone}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2 pt-1">
                      <MapPin className="h-4 w-4 text-[#1A1A1A]/40 shrink-0 mt-0.5" />
                      <span className="text-[#1A1A1A]/60 text-[11px] leading-normal">{s.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-black/10 pt-4">
                <button
                  onClick={() => openEditModal(s)}
                  className="border border-black/15 px-3.5 py-1.5 font-sans font-bold text-[10px] uppercase tracking-wider text-[#1A1A1A] hover:bg-[#F2F1EE] rounded-none transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5 inline mr-1" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="border border-red-200 px-3.5 py-1.5 font-sans font-bold text-[10px] uppercase tracking-wider text-red-700 hover:bg-red-50 rounded-none transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreate} className="w-full max-w-lg border border-black bg-[#FDFCFB] p-8 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4 mb-5">
              <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Add New Supplier Partner</h3>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            {errorMsg && (
              <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold mb-4">{errorMsg}</div>
            )}

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Supplier Name</label>
                <input
                  type="text" required placeholder="e.g. Apex Electronics Co" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Contact Person</label>
                  <input
                    type="text" placeholder="e.g. Sarah Jenkins" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Lead Time (Days)</label>
                  <input
                    type="number" min="1" required value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Email Address</label>
                  <input
                    type="email" placeholder="sales@apex.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Phone Number</label>
                  <input
                    type="text" placeholder="555-0100" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">Fulfillment Status</label>
                <div className="flex gap-4">
                  {(['Active', 'Preferred', 'Inactive'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-gray-700 cursor-pointer">
                      <input
                        type="radio" name="status" checked={status === s} onChange={() => setStatus(s)}
                        className="h-3.5 w-3.5 accent-black"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Office/Warehouse Address</label>
                <textarea
                  rows={2} placeholder="Physical corporate mailing address..." value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
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
                type="submit" disabled={submitting}
                className="bg-black text-white px-6 py-2.5 font-sans font-bold text-[10px] uppercase tracking-wider hover:bg-black/80 disabled:opacity-50 rounded-none"
              >
                {submitting ? "Saving..." : "Add Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Modal */}
      {editModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleUpdate} className="w-full max-w-lg border border-black bg-[#FDFCFB] p-8 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-black pb-4 mb-5">
              <h3 className="font-serif italic text-2xl font-semibold text-[#1A1A1A]">Edit Supplier Partner</h3>
              <button type="button" onClick={() => setEditModalOpen(false)} className="text-xl hover:text-black/70">✕</button>
            </div>

            {errorMsg && (
              <div className="border border-red-600/30 bg-red-50 p-3 text-xs text-red-800 rounded-none font-semibold mb-4">{errorMsg}</div>
            )}

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Supplier Name</label>
                <input
                  type="text" required placeholder="e.g. Apex Electronics Co" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Contact Person</label>
                  <input
                    type="text" placeholder="e.g. Sarah Jenkins" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Lead Time (Days)</label>
                  <input
                    type="number" min="1" required value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Email Address</label>
                  <input
                    type="email" placeholder="sales@apex.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Phone Number</label>
                  <input
                    type="text" placeholder="555-0100" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">Fulfillment Status</label>
                <div className="flex gap-4">
                  {(['Active', 'Preferred', 'Inactive'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-gray-700 cursor-pointer">
                      <input
                        type="radio" name="status" checked={status === s} onChange={() => setStatus(s)}
                        className="h-3.5 w-3.5 accent-black"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1">Office/Warehouse Address</label>
                <textarea
                  rows={2} placeholder="Physical corporate mailing address..." value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-black/15 bg-white px-3.5 py-2 outline-none focus:border-black rounded-none text-xs"
                />
              </div>
            </div>

            <div className="border-t border-black/10 pt-5 mt-6 flex justify-end gap-2.5">
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
                {submitting ? "Saving changes..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
