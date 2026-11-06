import { Router } from "express";
import { getProducts } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await getProducts());
});

router.get("/:id", async (req, res) => {
  const product = (await getProducts()).find((p) => p.id === Number(req.params.id));
  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  res.json(product);
});

export default router;
