const { app } = require("@azure/functions");
const { getPool, sql } = require("../shared/db");
const { isAdmin } = require("../shared/auth");

app.http("deleteProduct", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "admin/products/{id}",
  handler: async (request, context) => {
    if (!isAdmin(request)) {
      return { status: 403, jsonBody: { error: "No autorizado" } };
    }

    const id = Number(request.params.id);
    if (!id) return { status: 400, jsonBody: { error: "id inválido" } };

    try {
      const pool = await getPool();
      // Borrado "suave": lo marcamos inactivo en vez de eliminarlo de verdad,
      // así conservas el historial si algún pedido viejo lo referencia.
      await pool
        .request()
        .input("id", sql.Int, id)
        .query("UPDATE productos SET activo = 0 WHERE id = @id");

      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Error al borrar producto" } };
    }
  },
});
