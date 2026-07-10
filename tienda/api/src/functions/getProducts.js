const { app } = require("@azure/functions");
const { getPool } = require("../shared/db");

app.http("getProducts", {
  methods: ["GET"],
  authLevel: "anonymous", // público, lo usa la tienda para mostrar productos
  route: "products",
  handler: async (request, context) => {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .query("SELECT id, nombre, precio, precio_anterior, categoria, descripcion, badge, imagenes FROM productos WHERE activo = 1 ORDER BY id");

      const productos = result.recordset.map((p) => ({
        id: p.id,
        name: p.nombre,
        price: Number(p.precio),
        oldPrice: p.precio_anterior ? Number(p.precio_anterior) : null,
        category: p.categoria,
        desc: p.descripcion,
        badge: p.badge,
        images: p.imagenes ? JSON.parse(p.imagenes) : [],
      }));

      return { jsonBody: productos };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Error al obtener productos" } };
    }
  },
});
