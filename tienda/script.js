// ── DATA ──────────────────────────────────────────
let products = [
  {
    id: 1,
    name: "Camiseta Negra Oversize",
    price: 399,
    oldPrice: 499,
    category: "Camisetas",
    images: ["img/camiseta1.png", "img/mano1.png"],
    desc: "Camiseta negra de corte cómodo para entrenamiento o uso diario.",
    badge: "100% ALOGODON"
  },
  {
    id: 2,
    name: "Cuerda para Saltar",
    price: 199,
    oldPrice: 249,
    category: "Accesorios",
    images: ["img/cuerda.png"],
    desc: "Cuerda ligera para cardio, entrenamiento funcional y gimnasio.",
    badge: "100% ALOGODON"
  }
];

let cart = JSON.parse(localStorage.getItem('conocents_cart') || '[]');




// ── IMAGE INDEX TRACKER ───────────────────────────
const imageIndexes = {};

function cycleImage(productId, event) {
  event.stopPropagation();
  const p = products.find(p => p.id === productId);
  if (!p || !p.images || p.images.length <= 1) return;

  imageIndexes[productId] = ((imageIndexes[productId] || 0) + 1) % p.images.length;
  const img = document.getElementById(`prod-img-${productId}`);
  const dots = document.querySelectorAll(`.img-dot[data-id="${productId}"]`);

  if (img) {
    img.classList.add('img-fade');
    setTimeout(() => {
      img.src = p.images[imageIndexes[productId]];
      img.classList.remove('img-fade');
    }, 150);
  }

  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === imageIndexes[productId]);
  });
}

// ── RENDER PRODUCTS ───────────────────────────────
function renderProducts(filter = 'todos') {
  const grid = document.getElementById('productsGrid');
  const filtered = filter === 'todos' ? products : products.filter(p => p.category === filter);

  document.getElementById('statProducts').textContent = products.length;

  if (filtered.length === 0) {
    grid.innerHTML = products.length === 0
      ? `<div class="no-products"><p>💪 Aún no hay productos.</p><p style="font-size:.85rem">Haz clic en <strong style="color:var(--accent)">+ Agregar producto</strong> para comenzar.</p></div>`
      : `<div class="no-products"><p>No hay productos en esta categoría.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const imgs = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);
    const hasMultiple = imgs.length > 1;
    const currentIdx = imageIndexes[p.id] || 0;
    const dotsHtml = hasMultiple
      ? `<div class="img-dots">${imgs.map((_, i) => `<span class="img-dot${i === currentIdx ? ' active' : ''}" data-id="${p.id}"></span>`).join('')}</div>`
      : '';

    return `
    <div class="product-card">
      <div class="prod-img" onclick="${hasMultiple ? `cycleImage(${p.id}, event)` : `addToCart(${p.id})`}" style="${hasMultiple ? 'cursor:pointer' : ''}">
        ${p.badge ? `<span class="prod-badge">${p.badge}</span>` : ''}

        ${imgs.length
          ? `<img id="prod-img-${p.id}" src="${imgs[currentIdx]}" alt="${p.name}" class="product-img-real">`
          : `<span>${p.emoji || '🏋️'}</span>`
        }

        ${hasMultiple
          ? ''
          : `<div class="prod-overlay"><span style="font-size:0.85rem;font-weight:700;color:var(--accent);letter-spacing:.1em">+ AGREGAR</span></div>`
        }

        ${dotsHtml}
      </div>

      <div class="prod-body">
        <div class="prod-category">${p.category}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-desc">${p.desc || ''}</div>

        <div class="prod-footer">
          <div>
            <span class="prod-price">$${Number(p.price).toLocaleString()}</span>
            ${p.oldPrice ? `<span class="prod-price-old">$${Number(p.oldPrice).toLocaleString()}</span>` : ''}
          </div>

          <button class="add-cart-btn" onclick="addToCart(${p.id})">
            +
          </button>
        </div>
      </div>
    </div>
  `}).join('');
}

// ── FILTERS ───────────────────────────────────────
function updateFilters() {
  const categories = ['todos', ...new Set(products.map(p => p.category))];
  const filtersEl = document.getElementById('filters');
  filtersEl.innerHTML = categories.map(c => `
    <button class="filter-btn ${c==='todos'?'active':''}" onclick="filterProducts('${c}', this)">
      ${c === 'todos' ? 'Todos' : c}
    </button>
  `).join('');
}

function filterProducts(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(cat);
}





function saveProducts() {
  localStorage.setItem('conocents_products', JSON.stringify(products));
}


// ── CART ──────────────────────────────────────────
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ ...product, qty: 1 }); }
  saveCart();
  renderCart();
  updateCartCount();
  showToast(`Agregado al carrito`);
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  saveCart();
  renderCart();
  updateCartCount();
}

function saveCart() { localStorage.setItem('conocents_cart', JSON.stringify(cart)); }

function updateCartCount() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = total;
}

function renderCart() {
  const el = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  if (cart.length === 0) {
    el.innerHTML = `<div class="empty-cart"><p style="font-size:2rem">🛒</p><p>Tu carrito está vacío</p><p style="font-size:.8rem">Agrega productos para comenzar</p></div>`;
    totalEl.textContent = '$0';
    return;
  }

  const total = cart.reduce((s, c) => s + (c.price * c.qty), 0);
  totalEl.textContent = `$${total.toLocaleString()}`;

  el.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-emoji">
        ${
          c.images && c.images.length
            ? `<img src="${c.images[0]}" alt="${c.name}" class="cart-img-real">`
            : c.image
              ? `<img src="${c.image}" alt="${c.name}" class="cart-img-real">`
              : c.emoji || '🏋️'
        }
      </div>

      <div class="cart-item-info">
        <div class="cart-item-name">${c.name}</div>
        <div class="cart-item-price">$${Number(c.price).toLocaleString()} MXN</div>

        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateQty(${c.id}, -1)">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="updateQty(${c.id}, 1)">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function checkout() {
  if (cart.length === 0) { showToast('Tu carrito está vacío'); return; }
  const total = cart.reduce((s, c) => s + (c.price * c.qty), 0);
  const items = cart.map(c => `• ${c.name} x${c.qty} = $${(c.price*c.qty).toLocaleString()} MXN`).join('%0A');
  const msg = `🏋️ *Pedido Conocents*%0A%0A${items}%0A%0A*Total: $${total.toLocaleString()} MXN*%0A%0A¡Hola! Quiero hacer este pedido.`;
  window.open(`https://wa.me/526311234567?text=${msg}`, '_blank');
}


function toggleCart() {
  document.getElementById('cartOverlay').classList.toggle('open');
}

function handleCartClick(e) {
  if (e.target === document.getElementById('cartOverlay')) toggleCart();
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── INIT ──────────────────────────────────────────
updateFilters();
renderProducts();
updateCartCount();