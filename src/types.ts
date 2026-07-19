export interface User {
  id: number;
  uid: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  leadTimeDays: number;
  status: 'Active' | 'Inactive' | 'Preferred';
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minThreshold: number;
  price: string;
  supplierId?: number | null;
  supplierName?: string | null;
  description?: string | null;
  location?: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  type: 'Inbound' | 'Outbound' | 'Adjustment';
  quantity: number;
  reason?: string | null;
  performedBy: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  status: 'Pending' | 'Ordered' | 'Received' | 'Cancelled';
  orderDate: string;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  createdAt: string;
}

export interface ForecastItem {
  productId: number;
  name: string;
  sku: string;
  currentQuantity: number;
  estimatedWeeklyDemand: number;
  daysOfStockRemaining: number;
  status: 'Stable' | 'Moderate' | 'Critical restock';
  aiReasoning: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeSuppliersCount: number;
  pendingPOsCount: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  lowStockList: Product[];
  recentTransactions: Transaction[];
  categoryChart: { category: string; stock: number; value: number }[];
}
