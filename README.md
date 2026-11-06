# TP noté 1 — Suivi de commandes en direct (SSE)

Dépôt Git : https://github.com/mohed-abbas/temps-reel-tp1

Suivi de commandes d'une boutique en ligne. Les commandes sont créées et modifiées par l'API REST, et une page de suivi se met à jour en direct grâce aux Server-Sent Events.

Stack : Node.js 22, Express 5, TypeScript, JsonDB. Client en HTML et JavaScript simple.

## Lancement

```bash
docker compose up --build -d
```

L'application répond sur http://localhost:3000.

- `/` : page boutique (produits, création de commande, actions sur les commandes)
- `/order.html?id=<id>` : page de suivi d'une commande

Les données sont stockées dans `data/db.json` (volume Docker `db-data`) et survivent à un redémarrage. Au premier lancement, la base contient 2 utilisateurs et 3 produits.

Pour repartir d'une base vide :

```bash
docker compose down -v
```

## API REST

Toutes les routes sont préfixées par `/api`. Les corps sont en JSON. En cas d'erreur, la réponse est `{ "error": "message" }`.

### Utilisateurs

| Méthode | Route | Description | Codes |
| --- | --- | --- | --- |
| GET | `/api/users` | Liste des utilisateurs | 200 |
| GET | `/api/users/:id` | Un utilisateur | 200, 404 |

### Produits

| Méthode | Route | Description | Codes |
| --- | --- | --- | --- |
| GET | `/api/products` | Liste des produits avec leur stock | 200 |
| GET | `/api/products/:id` | Un produit | 200, 404 |

### Commandes

| Méthode | Route | Description | Codes |
| --- | --- | --- | --- |
| GET | `/api/orders` | Liste des commandes | 200 |
| GET | `/api/orders/:id` | Une commande | 200, 404 |
| POST | `/api/orders` | Crée une commande | 201, 400, 404, 409 |
| PATCH | `/api/orders/:id/status` | Fait avancer le statut | 200, 400, 404, 409 |
| POST | `/api/orders/:id/cancel` | Annule la commande | 200, 404, 409 |

**POST `/api/orders`**

```json
{ "userId": 1, "productId": 2, "quantity": 3 }
```

- `201` : commande créée avec le statut `preparing`. Le stock du produit diminue de `quantity`.
- `400` : champ manquant, ou valeur qui n'est pas un entier positif, ou JSON invalide.
- `404` : client ou produit introuvable.
- `409` : stock insuffisant.

**PATCH `/api/orders/:id/status`**

```json
{ "status": "shipped" }
```

Le statut avance d'un cran à la fois : `preparing` → `shipped` → `delivered`.

- `200` : statut mis à jour.
- `400` : `status` absent ou différent de `shipped` / `delivered`.
- `404` : commande introuvable.
- `409` : transition impossible (saut de statut, retour en arrière, commande livrée ou annulée).

20 secondes après le passage à `shipped`, la commande passe seule à `delivered`.

**POST `/api/orders/:id/cancel`**

- `200` : commande passée à `cancelled` (elle est conservée), le stock est rendu au produit.
- `404` : commande introuvable.
- `409` : la commande n'est plus en préparation (déjà expédiée, livrée ou annulée).

### Exemples

```bash
curl -X POST localhost:3000/api/orders -H "Content-Type: application/json" -d '{"userId":1,"productId":1,"quantity":2}'
```

```bash
curl -X PATCH localhost:3000/api/orders/1/status -H "Content-Type: application/json" -d '{"status":"shipped"}'
```

```bash
curl -X POST localhost:3000/api/orders/1/cancel
```

## Flux SSE

| Route | Contenu |
| --- | --- |
| GET `/api/events` | Tous les événements (commandes et stock), utilisé par la page boutique |
| GET `/api/orders/:id/events` | Uniquement les événements de la commande `:id` (404 si elle n'existe pas) |

Événements envoyés (le champ `data` contient l'objet en JSON) :

| Événement | Données | Quand |
| --- | --- | --- |
| `order-created` | `Order` | Création d'une commande |
| `order-status` | `Order` | Changement de statut (y compris la livraison automatique) |
| `order-cancelled` | `Order` | Annulation d'une commande |
| `stock-updated` | `Product` | Variation du stock d'un produit |

Sur `/api/orders/:id/events`, le serveur envoie dès la connexion un `order-status` avec l'état actuel de la commande, puis seulement les événements de cette commande. Le filtrage est fait côté serveur.

Quand un abonné ferme l'onglet ou change de page, la connexion se ferme et le serveur le retire de la liste des abonnés (visible dans `docker compose logs`).

```bash
curl -N localhost:3000/api/orders/1/events
```

## Avancement

### Exigences

- [x] F1 — 3 produits et 2 utilisateurs, persistance JsonDB
- [x] F2 — Création de commande avec contrôles et décrément du stock
- [x] F3 — Avancement du statut un cran à la fois, sans retour en arrière
- [x] F4 — Annulation d'une commande en préparation avec remise en stock
- [x] F5 — Livraison automatique 20 s après l'expédition
- [x] F6 — API REST avec codes d'erreur, documentée ci-dessus
- [x] F7 — Événements SSE nommés pour les commandes et le stock
- [x] F8 — Abonnés retirés à la déconnexion
- [x] F9 — Page de suivi mise à jour en direct
- [x] F10 — Filtrage des événements côté serveur

### Bonus

- [ ] B1 — Rattrapage des événements manqués
- [ ] B2 — Fin du flux après livraison ou annulation
- [ ] B3 — Délai de reconnexion de 5 s
- [ ] B4 — Connexion maintenue derrière un proxy (30 s)
