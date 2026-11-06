import { Router } from "express";
import { getUsers } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await getUsers());
});

router.get("/:id", async (req, res) => {
  const user = (await getUsers()).find((u) => u.id === Number(req.params.id));
  if (!user) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }
  res.json(user);
});

export default router;
