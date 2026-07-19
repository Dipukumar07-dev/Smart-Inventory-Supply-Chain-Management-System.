import express from "express";
import path from "path";
import * as dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables before anything else
dotenv.config();

// Direct ESM imports with explicit extensions as required
import { db } from "./src/db/index.ts";
import { users, products, suppliers, transactions, purchaseOrders } from "./src/db/schema.ts";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini API client
const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("WARNING: GEMINI_API_KEY is not configured in secrets. AI forecasting and reports will use fallback simulation.");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

const ai = getGeminiClient();

// Helper to register/sync authenticated users in PostgreSQL
async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users).values({
      uid,
      email,
      name: name || email.split("@")[0],
    }).returning();
    return inserted[0];
  } catch (err) {
    console.error("Error in getOrCreateUser:", err);
    throw new Error("Failed to synchronize user profile", { cause: err });
  }
}

// --- API ENDPOINTS ---

// Sync and return user profile
app.get("/api/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userProfile = await getOrCreateUser(req.user.uid, req.user.email, req.user.name);
    res.json(userProfile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to sync user" });
  }
});

// Dashboard statistics
app.get("/api/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    // 1. Total stock items and total estimated cost
    const allProducts = await db.select().from(products);
    const totalItems = allProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = allProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0);
    const lowStockItems = allProducts.filter(p => p.quantity <= p.minThreshold);
    const outOfStockItems = allProducts.filter(p => p.quantity === 0);

    // 2. Active suppliers count
    const allSuppliers = await db.select().from(suppliers);
    const activeSuppliersCount = allSuppliers.filter(s => s.status !== "Inactive").length;

    // 3. Pending Purchase Orders count
    const allPOs = await db.select().from(purchaseOrders);
    const pendingPOsCount = allPOs.filter(p => p.status === "Pending" || p.status === "Ordered").length;

    // 4. Recent transactions joined with product names
    const recentTx = await db.select({
      id: transactions.id,
      type: transactions.type,
      quantity: transactions.quantity,
      reason: transactions.reason,
      performedBy: transactions.performedBy,
      createdAt: transactions.createdAt,
      productName: products.name,
      productSku: products.sku,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .orderBy(desc(transactions.createdAt))
    .limit(8);

    // 5. Category breakdown
    const categoryMap: { [key: string]: { count: number; value: number } } = {};
    allProducts.forEach(p => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { count: 0, value: 0 };
      }
      categoryMap[p.category].count += p.quantity;
      categoryMap[p.category].value += parseFloat(p.price) * p.quantity;
    });

    const categoryData = Object.keys(categoryMap).map(cat => ({
      category: cat,
      stock: categoryMap[cat].count,
      value: Math.round(categoryMap[cat].value * 100) / 100,
    }));

    res.json({
      summary: {
        totalProducts: allProducts.length,
        totalStock: totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        activeSuppliersCount,
        pendingPOsCount,
      },
      lowStockList: lowStockItems,
      recentTransactions: recentTx,
      categoryChart: categoryData,
    });
  } catch (err: any) {
    console.error("Dashboard calculation error:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

// Products CRUD
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const list = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      category: products.category,
      quantity: products.quantity,
      minThreshold: products.minThreshold,
      price: products.price,
      supplierId: products.supplierId,
      description: products.description,
      location: products.location,
      createdAt: products.createdAt,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .orderBy(products.name);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const { name, sku, category, quantity, minThreshold, price, supplierId, description, location } = req.body;
    
    if (!name || !sku || !category) {
      return res.status(400).json({ error: "Name, SKU, and Category are required fields." });
    }

    // SKU uniqueness check
    const existing = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: `SKU '${sku}' already exists.` });
    }

    const inserted = await db.insert(products).values({
      name,
      sku,
      category,
      quantity: quantity ? parseInt(quantity) : 0,
      minThreshold: minThreshold ? parseInt(minThreshold) : 10,
      price: price || "0.00",
      supplierId: supplierId ? parseInt(supplierId) : null,
      description,
      location,
    }).returning();

    // Log transaction for initial inventory entry if quantity > 0
    if (quantity && parseInt(quantity) > 0) {
      await db.insert(transactions).values({
        productId: inserted[0].id,
        type: "Inbound",
        quantity: parseInt(quantity),
        reason: "Initial stock entry",
        performedBy: (req as any).user?.email || "System",
      });
    }

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    console.error("Create product failed:", err);
    res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

app.put("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sku, category, quantity, minThreshold, price, supplierId, description, location } = req.body;

    // Check if another product has the same SKU
    if (sku) {
      const existing = await db.select().from(products).where(and(eq(products.sku, sku), sql`id != ${id}`)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: `SKU '${sku}' is already in use by another product.` });
      }
    }

    // Fetch original product to check for stock adjustment
    const orig = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (orig.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated = await db.update(products).set({
      name,
      sku,
      category,
      quantity: quantity !== undefined ? parseInt(quantity) : undefined,
      minThreshold: minThreshold !== undefined ? parseInt(minThreshold) : undefined,
      price,
      supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId) : null) : undefined,
      description,
      location,
    }).where(eq(products.id, id)).returning();

    // If quantity was adjusted, log transaction
    if (quantity !== undefined && parseInt(quantity) !== orig[0].quantity) {
      const diff = parseInt(quantity) - orig[0].quantity;
      await db.insert(transactions).values({
        productId: id,
        type: diff > 0 ? "Inbound" : "Outbound",
        quantity: Math.abs(diff),
        reason: "Manual adjustment",
        performedBy: (req as any).user?.email || "System",
      });
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update product" });
  }
});

app.delete("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(products).where(eq(products.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Suppliers CRUD
app.get("/api/suppliers", requireAuth, async (req, res) => {
  try {
    const list = await db.select().from(suppliers).orderBy(suppliers.name);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

app.post("/api/suppliers", requireAuth, async (req, res) => {
  try {
    const { name, contactName, email, phone, address, leadTimeDays, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Supplier name is required" });
    }
    const inserted = await db.insert(suppliers).values({
      name,
      contactName,
      email,
      phone,
      address,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : 7,
      status: status || "Active",
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactName, email, phone, address, leadTimeDays, status } = req.body;
    const updated = await db.update(suppliers).set({
      name,
      contactName,
      email,
      phone,
      address,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : undefined,
      status,
    }).where(eq(suppliers.id, id)).returning();
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliers).where(eq(suppliers.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

// Transactions endpoint
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const list = await db.select({
      id: transactions.id,
      productId: transactions.productId,
      type: transactions.type,
      quantity: transactions.quantity,
      reason: transactions.reason,
      performedBy: transactions.performedBy,
      createdAt: transactions.createdAt,
      productName: products.name,
      productSku: products.sku,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .orderBy(desc(transactions.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  try {
    const { productId, type, quantity, reason } = req.body;
    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: "Product, Type, and Quantity are required" });
    }

    const prodId = parseInt(productId);
    const qty = parseInt(quantity);

    if (qty <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than zero" });
    }

    // Retrieve original product
    const prod = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
    if (prod.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    let newQty = prod[0].quantity;
    if (type === "Inbound") {
      newQty += qty;
    } else if (type === "Outbound") {
      if (newQty < qty) {
        return res.status(400).json({ error: `Insufficient stock. Current inventory of '${prod[0].name}' is only ${prod[0].quantity}.` });
      }
      newQty -= qty;
    } else if (type === "Adjustment") {
      // Just a direct addition/subtraction
      newQty = Math.max(0, newQty + qty); // Here, quantity can be positive or negative for adjustments
    } else {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    // Update product quantity
    await db.update(products).set({ quantity: newQty }).where(eq(products.id, prodId));

    // Log transaction
    const logged = await db.insert(transactions).values({
      productId: prodId,
      type,
      quantity: qty,
      reason,
      performedBy: (req as any).user?.email || "Operator",
    }).returning();

    res.status(201).json(logged[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to log transaction" });
  }
});

// Purchase Orders (Reorders)
app.get("/api/purchase-orders", requireAuth, async (req, res) => {
  try {
    const list = await db.select({
      id: purchaseOrders.id,
      supplierId: purchaseOrders.supplierId,
      productId: purchaseOrders.productId,
      quantity: purchaseOrders.quantity,
      status: purchaseOrders.status,
      orderDate: purchaseOrders.orderDate,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      actualDeliveryDate: purchaseOrders.actualDeliveryDate,
      createdAt: purchaseOrders.createdAt,
      productName: products.name,
      productSku: products.sku,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .innerJoin(products, eq(purchaseOrders.productId, products.id))
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.orderDate));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

app.post("/api/purchase-orders", requireAuth, async (req, res) => {
  try {
    const { supplierId, productId, quantity, leadTimeDays } = req.body;
    if (!supplierId || !productId || !quantity) {
      return res.status(400).json({ error: "Supplier, Product, and Quantity are required" });
    }

    // Compute expected delivery date based on lead time
    const computedDays = leadTimeDays ? parseInt(leadTimeDays) : 7;
    const expected = new Date();
    expected.setDate(expected.getDate() + computedDays);

    const inserted = await db.insert(purchaseOrders).values({
      supplierId: parseInt(supplierId),
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      status: "Pending",
      expectedDeliveryDate: expected,
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

app.put("/api/purchase-orders/:id/status", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const existing = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const currentStatus = existing[0].status;

    // Build update fields
    const updateFields: any = { status };
    if (status === "Received") {
      updateFields.actualDeliveryDate = new Date();
    }

    const updated = await db.update(purchaseOrders).set(updateFields).where(eq(purchaseOrders.id, id)).returning();

    // Trigger inventory update if status changes to 'Received'
    if (status === "Received" && currentStatus !== "Received") {
      const prodId = existing[0].productId;
      const qty = existing[0].quantity;

      // Update product quantity
      const prod = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
      if (prod.length > 0) {
        await db.update(products).set({
          quantity: prod[0].quantity + qty
        }).where(eq(products.id, prodId));

        // Log inbound transaction
        await db.insert(transactions).values({
          productId: prodId,
          type: "Inbound",
          quantity: qty,
          reason: `Fulfilled purchase order PO-#${id}`,
          performedBy: (req as any).user?.email || "System",
        });
      }
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update purchase order status" });
  }
});

// --- AI INTELLIGENCE ENDPOINTS (GEMINI PROXIES) ---

// 1. Demand Forecasting
app.post("/api/forecast", requireAuth, async (req, res) => {
  try {
    // Collect database content to send to Gemini
    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      category: products.category,
      quantity: products.quantity,
      minThreshold: products.minThreshold,
      price: products.price,
    }).from(products);

    const recentTx = await db.select({
      productId: transactions.productId,
      type: transactions.type,
      quantity: transactions.quantity,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(50);

    const supplierList = await db.select({
      id: suppliers.id,
      name: suppliers.name,
      leadTimeDays: suppliers.leadTimeDays,
    }).from(suppliers);

    if (!ai) {
      // Return simulated forecasting if Gemini key is missing
      return res.json({
        forecasts: allProducts.map(p => {
          const matchedTx = recentTx.filter(t => t.productId === p.id);
          const outbounds = matchedTx.filter(t => t.type === 'Outbound').reduce((sum, t) => sum + t.quantity, 0);
          const weeklyDemand = Math.max(1, Math.round(outbounds * 0.7));
          const daysOfStockLeft = weeklyDemand > 0 ? Math.round((p.quantity / weeklyDemand) * 7) : 999;
          const status = daysOfStockLeft < 10 ? 'Critical restock' : daysOfStockLeft < 30 ? 'Moderate' : 'Stable';
          
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            currentQuantity: p.quantity,
            estimatedWeeklyDemand: weeklyDemand,
            daysOfStockRemaining: daysOfStockLeft,
            status,
            aiReasoning: "Based on recent movement logs showing standard consumption trends in this category.",
          };
        }),
        isSimulated: true
      });
    }

    // Query Gemini
    const prompt = `You are a professional Inventory and Supply Chain Predictor.
Analyze the following inventory items and transaction logs to calculate a 30-day demand forecast.

Products:
${JSON.stringify(allProducts, null, 2)}

Transaction Logs:
${JSON.stringify(recentTx, null, 2)}

Suppliers:
${JSON.stringify(supplierList, null, 2)}

Provide your analysis in clean, parseable JSON format. Respond ONLY with the JSON document. Do not include markdown codeblocks (no \`\`\`json etc).
The JSON MUST match this schema:
{
  "forecasts": [
    {
      "productId": number,
      "name": "string",
      "sku": "string",
      "currentQuantity": number,
      "estimatedWeeklyDemand": number,
      "daysOfStockRemaining": number,
      "status": "Stable" | "Moderate" | "Critical restock",
      "aiReasoning": "1-2 sentence concise explanation on why this demand level and status was calculated."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedText);
    res.json({ ...result, isSimulated: false });

  } catch (err: any) {
    console.error("Gemini forecasting failed:", err);
    res.status(500).json({ error: "Gemini analysis error. Please verify API key." });
  }
});

// 2. Supply Chain Health Report
app.post("/api/report", requireAuth, async (req, res) => {
  try {
    const allProducts = await db.select({
      name: products.name,
      sku: products.sku,
      quantity: products.quantity,
      minThreshold: products.minThreshold,
      price: products.price,
    }).from(products);

    const pendingPOs = await db.select({
      id: purchaseOrders.id,
      quantity: purchaseOrders.quantity,
      status: purchaseOrders.status,
      productName: products.name,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .innerJoin(products, eq(purchaseOrders.productId, products.id))
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(eq(purchaseOrders.status, "Pending"), eq(purchaseOrders.status, "Ordered")));

    if (!ai) {
      // Standard static/simulated report if no Gemini API Key is available
      return res.json({
        report: `## Executive Summary (Mock Analysis)
The supply chain network is operational with standard stock levels.

### Core Metrics:
* **Total unique inventory skus**: ${allProducts.length}
* **Low stock threshold warnings**: ${allProducts.filter(p => p.quantity <= p.minThreshold).length} items
* **Outstanding Supplier Purchase Orders**: ${pendingPOs.length} POs

### Actionable Recommendations:
1. **Replenish Low Thresholds**: Urgently file orders for items that have breached limits.
2. **Review Supplier Lead Times**: Standardize communications with suppliers with lead times exceeding 7 days.
`,
        isSimulated: true,
      });
    }

    const prompt = `You are a senior Operations Director and Supply Chain Strategist.
Write a concise, polished executive supply chain and inventory health report in Markdown format.

Review the current inventory:
${JSON.stringify(allProducts, null, 2)}

Outstanding Purchase Orders:
${JSON.stringify(pendingPOs, null, 2)}

Provide:
1. An Executive Summary paragraph.
2. High-impact Supply Chain Metrics.
3. List of Key Security and Shortage Risks.
4. Actionable recommendations with targeted quantities for restocks.

Make the tone professional, direct, and elite. Output ONLY the markdown report.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text || "Empty report.", isSimulated: false });
  } catch (err: any) {
    console.error("Gemini report generation failed:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// --- VITE DEV SERVER AND PRODUCTION SPA STATIC HANDLING ---

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware loaded.");
  } else {
    // Server static production assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch(err => {
  console.error("Server startup crash:", err);
});
