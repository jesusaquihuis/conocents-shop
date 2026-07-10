const { app } = require("@azure/functions");
const { getPool, sql } = require("../shared/db");
const { isAdmin } = require("../shared/auth");

app.http("updateProduct", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "admin/products/{id}",
  handler: async (request, context) => {
    if (!isAdmin(request)) {
      return { status: 403, jsonBody: { error: "No autorizado" } };
    }

    const id = Number(request.params.id);
    if (!id) return { status: 400, jsonBody: { error: "id inválido" } };

    const body = await request.json();
    const { name, price, oldPrice, category, desc, badge, images, active } = body;

    try {
      const pool = await getPool();
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("nombre", sql.NVarChar, name)
        .input("precio", sql.Decimal(10, 2), price)
        .input("precio_anterior", sql.Decimal(10, 2), oldPrice || null)
        .input("categoria", sql.NVarChar, category)
        .input("descripcion", sql.NVarChar, desc || null)
        .input("badge", sql.NVarChar, badge || null)
        .input("imagenes", sql.NVarChar, JSON.stringify(images || []))
        .input("activo", sql.Bit, active === undefined ? 1 : active)
        .query(`
          UPDATE productos SET
            nombre = @nombre,
            precio = @precio,
            precio_anterior = @precio_anterior,
            categoria = @categoria,
            descripcion = @descripcion,
            badge = @badge,
            imagenes = @imagenes,
            activo = @activo
          WHERE id = @id
        `);

      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Error al actualizar producto" } };
    }
  },
});
