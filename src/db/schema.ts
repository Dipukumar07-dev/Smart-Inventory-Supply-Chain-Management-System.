import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';

// Users table (synchronized via Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  leadTimeDays: integer('lead_time_days').default(7).notNull(),
  status: text('status').default('Active').notNull(), // 'Active', 'Inactive', 'Preferred'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Products (Inventory items) table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull(),
  quantity: integer('quantity').default(0).notNull(),
  minThreshold: integer('min_threshold').default(10).notNull(), // For low-stock alerts
  price: numeric('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  description: text('description'),
  location: text('location'), // Warehouse bin or storage shelf
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Inventory transactions (Inbound/Outbound log)
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'Inbound', 'Outbound', 'Adjustment'
  quantity: integer('quantity').notNull(), // Always positive value, flow direction is determined by type
  reason: text('reason'), // e.g. 'Restock', 'Sale', 'Damaged', 'Correction'
  performedBy: text('performed_by').notNull(), // User email/name who logged it
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Purchase orders (Supplier orders)
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  status: text('status').default('Pending').notNull(), // 'Pending', 'Ordered', 'Received', 'Cancelled'
  orderDate: timestamp('order_date').defaultNow().notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships definitions for Drizzle queries
export const usersRelations = relations(users, ({}) => ({}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  transactions: many(transactions),
  purchaseOrders: many(purchaseOrders),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  product: one(products, {
    fields: [purchaseOrders.productId],
    references: [products.id],
  }),
}));
