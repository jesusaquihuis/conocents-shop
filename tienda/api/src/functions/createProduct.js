const { app } = require("@azure/functions");
const { getPool, sql } = require("../shared/db");
const { isAdmin } = require("../shared/auth");

app.http("createProduct", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/products",

  handler: async (request, context) => {
    try {
      if (!isAdmin(request)) {
        return {
          status: 403,
          jsonBody: {
            error: "No autorizado",
          },
        };
      }

      const body = await request.json();

      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const desc = String(body.desc || "").trim();
      const badge = String(body.badge || "").trim();
      const price = Number(body.price);

      const oldPrice =
        body.oldPrice === null ||
        body.oldPrice === undefined ||
        body.oldPrice === ""
          ? null
          : Number(body.oldPrice);

      const images = Array.isArray(body.images)
        ? body.images
        : [];

      if (
        !name ||
        !category ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return {
          status: 400,
          jsonBody: {
            error: "Nombre, precio y categoría son obligatorios",
          },
        };
      }

      if (
        oldPrice !== null &&
        !Number.isFinite(oldPrice)
      ) {
        return {
          status: 400,
          jsonBody: {
            error: "El precio anterior no es válido",
          },
        };
      }

      const pool = await getPool();

      const result = await pool
        .request()
        .input("nombre", sql.NVarChar(255), name)
        .input("precio", sql.Decimal(10, 2), price)
        .input(
          "precio_anterior",
          sql.Decimal(10, 2),
          oldPrice
        )
        .input("categoria", sql.NVarChar(255), category)
        .input(
          "descripcion",
          sql.NVarChar(sql.MAX),
          desc || null
        )
        .input(
          "badge",
          sql.NVarChar(255),
          badge || null
        )
        .input(
          "imagenes",
          sql.NVarChar(sql.MAX),
          JSON.stringify(images)
        )
        .input("activo", sql.Bit, 1)
        .query(`
          INSERT INTO productos (
            nombre,
            precio,
            precio_anterior,
            categoria,
            descripcion,
            badge,
            imagenes,
            activo
          )
          OUTPUT INSERTED.id
          VALUES (
            @nombre,
            @precio,
            @precio_anterior,
            @categoria,
            @descripcion,
            @badge,
            @imagenes,
            @activo
          )
        `);

      return {
        status: 201,
        jsonBody: {
          id: result.recordset[0].id,
          message: "Producto creado correctamente",
        },
      };
    } catch (error) {
      context.error("Error al crear producto:", error);

      return {
        status: 500,
        jsonBody: {
          error: "Error al crear producto",
          detail: error.message,
        },
      };
    }
  },
});
