import { mkdirSync } from "node:fs";
import { Config, JsonDB } from "node-json-db";
import type { Order, Product, User } from "./types";

mkdirSync("data", { recursive: true });
const db = new JsonDB(new Config("data/db.json", true, true, "/"));

const defaultUsers: User[] = [
  { id: 1, name: "Alice Martin", username: "alice", email: "alice@example.com" },
  { id: 2, name: "Bob Durand", username: "bob", email: "bob@example.com" },
];

const defaultProducts: Product[] = [
  { id: 1, name: "Clavier mécanique", stock: 10 },
  { id: 2, name: "Souris sans fil", stock: 5 },
  { id: 3, name: "Écran 27 pouces", stock: 3 },
];

export async function initDb(): Promise<void> {
  if (!(await db.exists("/users"))) await db.push("/users", defaultUsers);
  if (!(await db.exists("/products"))) await db.push("/products", defaultProducts);
  if (!(await db.exists("/orders"))) await db.push("/orders", []);
}

export const getUsers = () => db.getObject<User[]>("/users");
export const getProducts = () => db.getObject<Product[]>("/products");
export const getOrders = () => db.getObject<Order[]>("/orders");

export const saveProducts = (products: Product[]) => db.push("/products", products);
export const saveOrders = (orders: Order[]) => db.push("/orders", orders);
