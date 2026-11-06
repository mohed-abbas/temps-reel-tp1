let users = [];
let products = [];
let orders = [];

const message = document.getElementById("message");

function nameOf(list, id) {
  const item = list.find((x) => x.id === id);
  return item ? item.name : `#${id}`;
}

function renderProducts() {
  document.getElementById("products").innerHTML = products
    .map((p) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.stock}</td></tr>`)
    .join("");
}

function renderOrders() {
  document.getElementById("orders").innerHTML = orders
    .map((o) => {
      const actions = [];
      if (o.status === "preparing") {
        actions.push(`<button data-action="shipped" data-id="${o.id}">Expédier</button>`);
        actions.push(`<button data-action="cancel" data-id="${o.id}">Annuler</button>`);
      }
      if (o.status === "shipped") {
        actions.push(`<button data-action="delivered" data-id="${o.id}">Livrer</button>`);
      }
      actions.push(`<a href="/order.html?id=${o.id}" target="_blank">Suivre</a>`);

      return `<tr>
        <td>${o.id}</td>
        <td>${nameOf(users, o.userId)}</td>
        <td>${nameOf(products, o.productId)}</td>
        <td>${o.quantity}</td>
        <td>${statusBadge(o.status)}</td>
        <td>${actions.join(" ")}</td>
      </tr>`;
    })
    .join("");
}

function upsert(list, item) {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) list.push(item);
  else list[index] = item;
}

async function init() {
  [users, products, orders] = await Promise.all([
    api("/api/users"),
    api("/api/products"),
    api("/api/orders"),
  ]);

  document.getElementById("user").innerHTML = users
    .map((u) => `<option value="${u.id}">${u.name}</option>`)
    .join("");
  document.getElementById("product").innerHTML = products
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  renderProducts();
  renderOrders();

  const source = new EventSource("/api/events");
  const onOrder = (e) => {
    upsert(orders, JSON.parse(e.data));
    renderOrders();
  };
  source.addEventListener("order-created", onOrder);
  source.addEventListener("order-status", onOrder);
  source.addEventListener("order-cancelled", onOrder);
  source.addEventListener("stock-updated", (e) => {
    upsert(products, JSON.parse(e.data));
    renderProducts();
    renderOrders();
  });
}

document.getElementById("order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const order = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        userId: Number(document.getElementById("user").value),
        productId: Number(document.getElementById("product").value),
        quantity: Number(document.getElementById("quantity").value),
      }),
    });
    message.className = "";
    message.textContent = `Commande #${order.id} créée.`;
  } catch (err) {
    message.className = "error";
    message.textContent = err.message;
  }
});

document.getElementById("orders").addEventListener("click", async (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  const { action, id } = button.dataset;
  try {
    if (action === "cancel") {
      await api(`/api/orders/${id}/cancel`, { method: "POST" });
    } else {
      await api(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
    }
    message.textContent = "";
  } catch (err) {
    message.className = "error";
    message.textContent = err.message;
  }
});

init();
