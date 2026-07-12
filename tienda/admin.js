let allProducts = [];

async function loadProducts() {
  const res = await fetch('/api/products');
  allProducts = await res.json();
  renderTable();
}

function renderTable() {
  const body = document.getElementById('productsTableBody');
  body.innerHTML = allProducts.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>$${p.price}</td>
      <td>${p.category}</td>
      <td class="row-actions">
        <button class="btn-secondary" onclick="editProduct(${p.id})">Editar</button>
        <button class="btn-danger" onclick="deleteProduct(${p.id})">Borrar</button>
      </td>
    </tr>
  `).join('');
}

function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('formTitle').textContent = `Editar: ${p.name}`;
  document.getElementById('editId').value = p.id;
  document.getElementById('fName').value = p.name;
  document.getElementById('fPrice').value = p.price;
  document.getElementById('fOldPrice').value = p.oldPrice || '';
  document.getElementById('fCategory').value = p.category;
  document.getElementById('fDesc').value = p.desc || '';
  document.getElementById('fBadge').value = p.badge || '';
  document.getElementById('fImages').value = (p.images || []).join(',');
  window.scrollTo(0, 0);
}

function resetForm() {
  document.getElementById('formTitle').textContent = 'Agregar producto';
  document.getElementById('editId').value = '';
  ['fName','fPrice','fOldPrice','fCategory','fDesc','fBadge','fImages'].forEach(id => document.getElementById(id).value = '');
}

async function saveProduct() {
  const id = document.getElementById('editId').value;
  const payload = {
    name: document.getElementById('fName').value.trim(),
    price: Number(document.getElementById('fPrice').value),
    oldPrice: document.getElementById('fOldPrice').value ? Number(document.getElementById('fOldPrice').value) : null,
    category: document.getElementById('fCategory').value.trim(),
    desc: document.getElementById('fDesc').value.trim(),
    badge: document.getElementById('fBadge').value.trim(),
    images: document.getElementById('fImages').value.split(',').map(s => s.trim()).filter(Boolean),
  };

  if (!payload.name || !payload.price || !payload.category) {
    alert('Nombre, precio y categoría son obligatorios');
    return;
  }

  const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
  const responseText = await res.text();

  let errorMessage = responseText;

  try {
    const data = JSON.parse(responseText);

    errorMessage =
      data.detail ||
      data.error ||
      data.message ||
      responseText;
  } catch {
    // La respuesta no era JSON.
  }

  console.error("Error HTTP:", res.status, errorMessage);

  alert(
    `Error al guardar el producto\n` +
    `HTTP ${res.status}\n` +
    `${errorMessage}`
  );

  return;
}

  resetForm();
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('¿Seguro que quieres borrar este producto?')) return;
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    alert('Error al borrar el producto');
    return;
  }
  loadProducts();
}

loadProducts();
