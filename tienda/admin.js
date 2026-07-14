let products = [];

const form = document.getElementById("productForm");
const editIdInput = document.getElementById("editId");
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const oldPriceInput = document.getElementById("oldPrice");
const categoryInput = document.getElementById("category");
const badgeInput = document.getElementById("badge");
const descriptionInput = document.getElementById("description");
const imagesInput = document.getElementById("images");
const isActiveInput = document.getElementById("isActive");

const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const refreshButton = document.getElementById("refreshButton");

const totalProducts = document.getElementById("totalProducts");
const apiStatus = document.getElementById("apiStatus");
const loadingMessage = document.getElementById("loadingMessage");
const emptyMessage = document.getElementById("emptyMessage");
const productsTable = document.getElementById("productsTable");
const productsTableBody = document.getElementById("productsTableBody");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

async function loadProducts() {
  loadingMessage.classList.remove("hidden");
  emptyMessage.classList.add("hidden");
  productsTable.classList.add("hidden");
  apiStatus.textContent = "Comprobando...";

  try {
    const response = await fetch("/api/products");
    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.error || `El API respondió con el error ${response.status}`
      );
    }

    products = Array.isArray(data) ? data : [];

    apiStatus.textContent = "Conectado";
    apiStatus.style.color = "#57d68d";

    renderProducts();
  } catch (error) {
    products = [];
    totalProducts.textContent = "0";
    loadingMessage.textContent = error.message;
    loadingMessage.classList.remove("hidden");

    apiStatus.textContent = "Error";
    apiStatus.style.color = "#ff7777";

    showToast(error.message, true);
  }
}

function renderProducts() {
  loadingMessage.classList.add("hidden");
  totalProducts.textContent = products.length;

  if (products.length === 0) {
    emptyMessage.classList.remove("hidden");
    productsTable.classList.add("hidden");
    return;
  }

  emptyMessage.classList.add("hidden");
  productsTable.classList.remove("hidden");

  productsTableBody.innerHTML = products
    .map(product => {
      const image =
        Array.isArray(product.images) && product.images.length
          ? product.images[0]
          : "";

      const imageHtml = image
        ? `
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(product.name)}"
            class="product-thumb"
          >
        `
        : `
          <div class="product-thumb product-thumb-placeholder">
            ◇
          </div>
        `;

      return `
        <tr>
          <td>
            <div class="product-cell">
              ${imageHtml}

              <div>
                <div class="product-name">
                  ${escapeHtml(product.name)}
                </div>

                <div class="product-description">
                  ${escapeHtml(product.desc || "Sin descripción")}
                </div>
              </div>
            </div>
          </td>

          <td>${escapeHtml(product.category)}</td>

          <td>
            <span class="price">
              ${formatPrice(product.price)}
            </span>
          </td>

          <td>
            <div class="action-buttons">
              <button
                type="button"
                class="edit-button"
                onclick="editProduct(${Number(product.id)})"
              >
                Editar
              </button>

              <button
                type="button"
                class="delete-button"
                onclick="deleteProduct(${Number(product.id)})"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getFormProduct() {
  return {
    name: nameInput.value.trim(),
    price: Number(priceInput.value),
    oldPrice: oldPriceInput.value
      ? Number(oldPriceInput.value)
      : null,
    category: categoryInput.value.trim(),
    badge: badgeInput.value.trim(),
    desc: descriptionInput.value.trim(),
    images: imagesInput.value
      .split(/\r?\n/)
      .map(image => image.trim())
      .filter(Boolean),
    isActive: isActiveInput.checked
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const id = editIdInput.value;
  const product = getFormProduct();
  const isEditing = Boolean(id);

  saveButton.disabled = true;
  saveButton.textContent = isEditing
    ? "Guardando cambios..."
    : "Guardando producto...";

  try {
    const response = await fetch(
      isEditing ? `/api/products/${id}` : "/api/products",
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.error || `No fue posible guardar. Error ${response.status}`
      );
    }

    showToast(
      isEditing
        ? "Producto actualizado correctamente."
        : "Producto agregado correctamente."
    );

    resetForm();
    await loadProducts();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Guardar producto";
  }
});

function editProduct(id) {
  const product = products.find(item => Number(item.id) === Number(id));

  if (!product) {
    showToast("No se encontró el producto.", true);
    return;
  }

  editIdInput.value = product.id;
  nameInput.value = product.name || "";
  priceInput.value = product.price ?? "";
  oldPriceInput.value = product.oldPrice ?? "";
  categoryInput.value = product.category || "";
  badgeInput.value = product.badge || "";
  descriptionInput.value = product.desc || "";
  imagesInput.value = Array.isArray(product.images)
    ? product.images.join("\n")
    : "";
  isActiveInput.checked = product.isActive !== false;

  formTitle.textContent = "Editar producto";
  saveButton.textContent = "Guardar cambios";
  cancelButton.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteProduct(id) {
  const product = products.find(item => Number(item.id) === Number(id));

  if (!product) return;

  const confirmed = window.confirm(
    `¿Seguro que quieres eliminar "${product.name}"?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE"
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.error || `No fue posible eliminar. Error ${response.status}`
      );
    }

    showToast("Producto eliminado correctamente.");

    if (Number(editIdInput.value) === Number(id)) {
      resetForm();
    }

    await loadProducts();
  } catch (error) {
    showToast(error.message, true);
  }
}

function resetForm() {
  form.reset();
  editIdInput.value = "";
  isActiveInput.checked = true;
  formTitle.textContent = "Agregar producto";
  saveButton.textContent = "Guardar producto";
  cancelButton.classList.add("hidden");
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

cancelButton.addEventListener("click", resetForm);
refreshButton.addEventListener("click", loadProducts);

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

loadProducts();
