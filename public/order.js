const id = new URLSearchParams(location.search).get("id");

function showOrder(order) {
  document.getElementById("status").innerHTML = statusBadge(order.status);
}

function logEvent(type, order) {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()} — ${type} → ${order.status}`;
  document.getElementById("log").prepend(li);
}

async function init() {
  if (!id) {
    document.getElementById("search").hidden = false;
    return;
  }

  try {
    const order = await api(`/api/orders/${id}`);
    const product = await api(`/api/products/${order.productId}`);

    document.getElementById("title").textContent = `Suivi de la commande #${order.id}`;
    document.getElementById("product").textContent = product.name;
    document.getElementById("quantity").textContent = order.quantity;
    document.getElementById("created").textContent = new Date(order.createdAt).toLocaleString();
    document.getElementById("details").hidden = false;
    showOrder(order);
  } catch (err) {
    document.getElementById("error").textContent = err.message;
    return;
  }

  // Le serveur n'envoie sur ce flux que les événements de cette commande
  const source = new EventSource(`/api/orders/${id}/events`);
  for (const type of ["order-status", "order-cancelled"]) {
    source.addEventListener(type, (e) => {
      const order = JSON.parse(e.data);
      showOrder(order);
      logEvent(type, order);
    });
  }
}

init();
