import { Router } from "express";
import { getOrders, getProducts, getUsers, saveOrders, saveProducts } from "../db";
import { publishOrder, publishStock, send, subscribe } from "../sse";
import type { Order, Status } from "../types";

const router = Router();

const DELIVERY_DELAY = 20_000;

const NEXT_STATUS: Record<Status, Status | null> = {
  preparing: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

async function findOrder(id: string) {
  const orders = await getOrders();
  return { orders, order: orders.find((o) => o.id === Number(id)) };
}

export function scheduleDelivery(orderId: number): void {
  setTimeout(async () => {
    const orders = await getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status !== "shipped") return;

    order.status = "delivered";
    await saveOrders(orders);
    publishOrder("order-status", order);
  }, DELIVERY_DELAY);
}

router.get("/", async (_req, res) => {
  res.json(await getOrders());
});

router.get("/:id", async (req, res) => {
  const { order } = await findOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  res.json(order);
});

router.get("/:id/events", async (req, res) => {
  const { order } = await findOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  subscribe(res, order.id);
  send(res, "order-status", order);
});

router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { userId, productId, quantity } = body;

  if (!isPositiveInt(userId) || !isPositiveInt(productId) || !isPositiveInt(quantity)) {
    res.status(400).json({ error: "userId, productId et quantity sont requis (entiers positifs)" });
    return;
  }

  const users = await getUsers();
  if (!users.some((u) => u.id === userId)) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }

  const products = await getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  if (product.stock < quantity) {
    res.status(409).json({ error: "Stock insuffisant" });
    return;
  }

  product.stock -= quantity;
  await saveProducts(products);

  const orders = await getOrders();
  const order: Order = {
    id: Math.max(0, ...orders.map((o) => o.id)) + 1,
    userId,
    productId,
    quantity,
    status: "preparing",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await saveOrders(orders);

  publishOrder("order-created", order);
  publishStock(product);
  res.status(201).json(order);
});

router.patch("/:id/status", async (req, res) => {
  const { orders, order } = await findOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const status: unknown = req.body?.status;
  if (status !== "shipped" && status !== "delivered") {
    res.status(400).json({ error: "status doit valoir \"shipped\" ou \"delivered\"" });
    return;
  }
  if (status !== NEXT_STATUS[order.status]) {
    res.status(409).json({ error: `Transition impossible : ${order.status} -> ${status}` });
    return;
  }

  order.status = status;
  await saveOrders(orders);
  publishOrder("order-status", order);
  if (status === "shipped") scheduleDelivery(order.id);

  res.json(order);
});

router.post("/:id/cancel", async (req, res) => {
  const { orders, order } = await findOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  if (order.status !== "preparing") {
    res.status(409).json({ error: "Seule une commande en préparation peut être annulée" });
    return;
  }

  order.status = "cancelled";
  await saveOrders(orders);

  const products = await getProducts();
  const product = products.find((p) => p.id === order.productId);
  if (product) {
    product.stock += order.quantity;
    await saveProducts(products);
    publishStock(product);
  }

  publishOrder("order-cancelled", order);
  res.json(order);
});

export default router;
