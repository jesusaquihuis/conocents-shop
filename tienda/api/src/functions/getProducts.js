const { app } = require("@azure/functions");
const { getPool } = require("../shared/db");

app.http("getProducts", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "products",

  handler: async (request, context) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          id,
          nombre,
          precio,
          precio_anterior,
          categoria,
          descripcion,
          badge,
          imagenes
        FROM productos
        WHERE activo = 1
        ORDER BY id
      `);

      const productos = result.recordset.map((producto) => {
        let images = [];

        try {
          images = producto.imagenes
            ? JSON.parse(producto.imagenes)
            : [];
        } catch {
          images = [];
        }

        return {
          id: producto.id,
          name: producto.nombre,
          price: Number(producto.precio),
          oldPrice:
            producto.precio_anterior !== null
              ? Number(producto.precio_anterior)
              : null,
          category: producto.categoria,
          desc: producto.descripcion,
          badge: producto.badge,
          images,
        };
      });

      return {
        status: 200,
        jsonBody: productos,
      };
    } catch (error) {
      context.error("Error al obtener productos:", error);

      return {
        status: 500,
        jsonBody: {
          error: "Error al obtener productos",
        },
      };
    }
  },
});
