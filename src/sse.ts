import type { Response } from "express";
import type { Order, Product } from "./types";

// orderId null = abonné à tout (page boutique), sinon seulement à cette commande
type Subscriber = { res: Response; orderId: number | null };

export type OrderEvent = "order-created" | "order-status" | "order-cancelled";

const subscribers = new Set<Subscriber>();

export function send(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(res: Response, orderId: number | null): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const subscriber: Subscriber = { res, orderId };
  subscribers.add(subscriber);
  console.log(`Abonné ajouté (${subscribers.size} au total)`);

  res.on("close", () => {
    subscribers.delete(subscriber);
    console.log(`Abonné retiré (${subscribers.size} au total)`);
  });
}

export function publishOrder(event: OrderEvent, order: Order): void {
  for (const s of subscribers) {
    if (s.orderId === null || s.orderId === order.id) send(s.res, event, order);
  }
}

export function publishStock(product: Product): void {
  for (const s of subscribers) {
    if (s.orderId === null) send(s.res, "stock-updated", product);
  }
}
