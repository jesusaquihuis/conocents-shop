const { app } = require("@azure/functions");
const { getPool, sql } = require("../shared/db");
const { isAdmin } = require("../shared/auth");

app.http("createProduct", {
  methods: ["POST"],
  authLevel: "anonymous", // el control real de acceso es por rol, ver isAdmin()
  route: "admin/products",
  handler: async (request, context) => {
    if (!isAdmin(request)) {
      return { status: 403, jsonBody: { error: "No autorizado" } };
    }

    const body = await request.json();
    const { name, price, oldPrice, category, desc, badge, images } = body;

    if (!name || !price || !category) {
      return { status: 400, jsonBody: { error: "Faltan campos requeridos: name, price, category" } };
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("nombre", sql.NVarChar, name)
        .input("precio", sql.Decimal(10, 2), price)
        .input("precio_anterior", sql.Decimal(10, 2), oldPrice || null)
        .input("categoria", sql.NVarChar, category)
        .input("descripcion", sql.NVarChar, desc || null)
        .input("badge", sql.NVarChar, badge || null)
        .input("imagenes", sql.NVarChar, JSON.stringify(images || []))
        .query(`
          INSERT INTO productos (nombre, precio, precio_anterior, categoria, descripcion, badge, imagenes)
          OUTPUT INSERTED.id
          VALUES (@nombre, @precio, @precio_anterior, @categoria, @descripcion, @badge, @imagenes)
        `);

      return { status: 201, jsonBody: { id: result.recordset[0].id } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Error al crear producto" } };
    }
  },
});
