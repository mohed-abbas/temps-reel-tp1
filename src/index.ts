import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { getOrders, initDb } from "./db";
import ordersRouter, { scheduleDelivery } from "./routes/orders";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import { subscribe } from "./sse";

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.get("/api/events", (_req, res) => subscribe(res, null));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status === 400 ? "JSON invalide" : "Erreur serveur" });
});

async function start(): Promise<void> {
  await initDb();

  // Relance la livraison auto des commandes restées expédiées avant un redémarrage
  for (const order of await getOrders()) {
    if (order.status === "shipped") scheduleDelivery(order.id);
  }

  app.listen(PORT, () => console.log(`Serveur sur http://localhost:${PORT}`));
}

start();
