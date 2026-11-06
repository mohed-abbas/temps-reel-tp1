# TP noté 1 — Suivi de commandes en direct (SSE)

Dépôt Git : https://github.com/mohed-abbas/temps-reel-tp1

Suivi de commandes d'une boutique en ligne. Les commandes sont gérées par l'API REST et la page de suivi se met à jour en direct grâce aux Server-Sent Events.

Stack : Node.js 22, Express 5, TypeScript, JsonDB, client en HTML/JS simple.

## Lancement

```bash
docker compose up --build -d
```

L'application répond sur http://localhost:3000 :

- `/` : page boutique (produits, création et gestion des commandes)
- `/order.html?id=<id>` : page de suivi d'une commande

Les données sont stockées dans `data/db.json` (volume `db-data`). Au premier lancement, la base contient 2 utilisateurs et 3 produits.

## API REST

Corps en JSON. En cas d'erreur, la réponse est `{ "error": "message" }`.

| Méthode | Route | Description | Codes |
| --- | --- | --- | --- |
| GET | `/api/users` | Liste des utilisateurs | 200 |
| GET | `/api/users/:id` | Un utilisateur | 200, 404 |
| GET | `/api/products` | Liste des produits avec leur stock | 200 |
| GET | `/api/products/:id` | Un produit | 200, 404 |
| GET | `/api/orders` | Liste des commandes | 200 |
| GET | `/api/orders/:id` | Une commande | 200, 404 |
| POST | `/api/orders` | Crée une commande `{ userId, productId, quantity }` | 201, 400, 404, 409 |
| PATCH | `/api/orders/:id/status` | Avance le statut `{ status: "shipped" \| "delivered" }` | 200, 400, 404, 409 |
| POST | `/api/orders/:id/cancel` | Annule une commande en préparation | 200, 404, 409 |

- `400` : champ manquant ou invalide, JSON invalide
- `404` : commande, client ou produit introuvable
- `409` : stock insuffisant, transition de statut impossible, annulation d'une commande déjà expédiée

Une commande expédiée passe automatiquement à `delivered` au bout de 20 secondes.

## Flux SSE

| Route | Contenu |
| --- | --- |
| GET `/api/events` | Tous les événements (page boutique) |
| GET `/api/orders/:id/events` | Uniquement les événements de cette commande |

Événements : `order-created`, `order-status`, `order-cancelled` (données : la commande) et `stock-updated` (données : le produit). Le serveur impose un délai de 5 secondes avant chaque reconnexion.
