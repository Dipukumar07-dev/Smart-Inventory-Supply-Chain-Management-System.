import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import Navbar from './components/Navbar.tsx';
import DashboardTab from './components/DashboardTab.tsx';
import ProductsTab from './components/ProductsTab.tsx';
import SuppliersTab from './components/SuppliersTab.tsx';
import TransactionsTab from './components/TransactionsTab.tsx';
import ReordersTab from './components/ReordersTab.tsx';
import ForecastTab from './components/ForecastTab.tsx';
import { DashboardData, Product, Supplier, Transaction, PurchaseOrder } from './types.ts';
import { 
  LayoutDashboard, Package, Truck, History, ClipboardList, TrendingUp, AlertTriangle, Cpu
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'suppliers' | 'transactions' | 'reorders' | 'forecast'>('dashboard');

  // DB resources states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch all warehouse metrics
  const fetchAllStats = async () => {
    setLoadingStats(true);
    setErrorState(null);
    try {
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const [dashRes, prodRes, supRes, txRes, poRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/transactions', { headers }),
        fetch('/api/purchase-orders', { headers }),
      ]);

      if (dashRes.ok && prodRes.ok && supRes.ok && txRes.ok && poRes.ok) {
        const [dash, prod, sup, tx, po] = await Promise.all([
          dashRes.json(),
          prodRes.json(),
          supRes.json(),
          txRes.json(),
          poRes.json(),
        ]);
        setDashboardData(dash);
        setProducts(prod);
        setSuppliers(sup);
        setTransactions(tx);
        setPurchaseOrders(po);
      } else {
        setErrorState("Database sync warning. Ensure proper proxy connection to the container database.");
      }
    } catch (err) {
      console.error("Failed to load inventory stats:", err);
      setErrorState("Failed to connect to the supply control room backend.");
    } finally {
      setLoadingStats(false);
    }
  };

  // Trigger data sync when auth loads or changes
  useEffect(() => {
    if (!loadingAuth) {
      fetchAllStats();
    }
  }, [loadingAuth, authToken]);

  const menuItems = [
    { id: 'dashboard', label: 'Overview Control', icon: LayoutDashboard },
    { id: 'products', label: 'Stock SKU List', icon: Package },
    { id: 'suppliers', label: 'Supplier List', icon: Truck },
    { id: 'transactions', label: 'Operations Audit', icon: History },
    { id: 'reorders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'forecast', label: 'AI Projections', icon: TrendingUp },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFCFB] font-sans text-[#1A1A1A] selection:bg-black selection:text-[#FDFCFB]">
      {/* Navbar header */}
      <Navbar user={user} loading={loadingAuth} />

      {/* Main workspace layout */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full shrink-0 border-b border-black/15 bg-[#FDFCFB] p-5 lg:w-64 lg:border-r lg:border-b-0">
          <nav className="space-y-1">
            <span className="block px-3.5 font-sans text-[9px] font-bold text-[#1A1A1A]/50 uppercase tracking-[0.25em] mb-4">
              Fulfillment Command
            </span>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 font-sans text-xs font-bold uppercase tracking-wider transition-all rounded-none border-y border-transparent ${
                    isActive 
                      ? 'bg-black text-white border-black font-extrabold' 
                      : 'text-[#1A1A1A]/70 hover:bg-[#F2F1EE] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Editorial Note */}
          <div className="hidden lg:block mt-12 border-t border-black/10 pt-6 px-3.5">
            <h4 className="font-serif text-sm italic font-medium text-[#1A1A1A]/80 mb-2">Vantage logistics</h4>
            <p className="font-sans text-[10px] leading-relaxed text-[#1A1A1A]/60">
              FlowChain automates inventory tracking, manufacturer communications, and predictive safety stock calculations.
            </p>
          </div>
        </aside>

        {/* Dynamic content staging canvas */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full flex flex-col justify-between">
          <div>
            {errorState && (
              <div className="mb-8 border border-red-600/30 bg-red-50 p-4 font-sans text-xs text-red-800 flex items-start gap-2.5 rounded-none">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <strong className="block font-bold uppercase tracking-wider text-red-950">Active Alarm Event</strong>
                  <span className="text-red-800/90 mt-0.5 block leading-normal">{errorState}</span>
                </div>
              </div>
            )}

            {/* Render Active Stage panel */}
            {activeTab === 'dashboard' && (
              <DashboardTab 
                data={dashboardData} 
                loading={loadingStats} 
                onRefresh={fetchAllStats}
                token={authToken}
              />
            )}

            {activeTab === 'products' && (
              <ProductsTab 
                products={products} 
                suppliers={suppliers} 
                loading={loadingStats} 
                onRefresh={fetchAllStats}
                token={authToken}
              />
            )}

            {activeTab === 'suppliers' && (
              <SuppliersTab 
                suppliers={suppliers} 
                loading={loadingStats} 
                onRefresh={fetchAllStats}
                token={authToken}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsTab 
                transactions={transactions} 
                products={products} 
                loading={loadingStats} 
                onRefresh={fetchAllStats}
                token={authToken}
              />
            )}

            {activeTab === 'reorders' && (
              <ReordersTab 
                purchaseOrders={purchaseOrders} 
                suppliers={suppliers} 
                products={products} 
                loading={loadingStats} 
                onRefresh={fetchAllStats}
                token={authToken}
              />
            )}

            {activeTab === 'forecast' && (
              <ForecastTab 
                token={authToken}
                onRefreshStats={fetchAllStats}
              />
            )}
          </div>
        </main>
      </div>

      {/* Footer: Editorial Live Alerts Ticker */}
      <footer className="flex items-center bg-black text-white min-h-[44px] py-2 px-8 font-sans border-t border-black">
        <div className="flex-none text-[9px] uppercase font-bold tracking-[0.25em] mr-8 text-[#7C8363] shrink-0">
          Live Alerts
        </div>
        <div className="flex-1 text-[10px] tracking-wide flex flex-wrap gap-x-6 gap-y-1 items-center justify-between font-mono text-[#FDFCFB]/85">
          <span>[14:02] RESTOCK COMPILER: ACTIVE & READY</span>
          <span className="opacity-30">|</span>
          <span>
            {products.some(p => p.quantity <= p.minThreshold) 
              ? `[CRITICAL STOCK] Low quantity on SKU: ${products.find(p => p.quantity <= p.minThreshold)?.sku}`
              : "[SYSTEM STATUS] All inventory levels within safety margin"
            }
          </span>
          <span className="opacity-30">|</span>
          <span>
            {purchaseOrders.some(po => po.status === 'Ordered')
              ? `[SHIPPING] Pending order PO-#00${purchaseOrders.find(po => po.status === 'Ordered')?.id} in transit`
              : "[FULFILLMENT] No active shipments pending"
            }
          </span>
        </div>
      </footer>
    </div>
  );
}
