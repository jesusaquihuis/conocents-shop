const { app } = require("@azure/functions");
const sql = require("mssql");

let poolPromise;

function getPool() {
  const connectionString = process.env.SQL_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("No se configuró SQL_CONNECTION_STRING");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(connectionString);
  }

  return poolPromise;
}

function parseImages(value) {
  if (!value) return [];

  try {
    const images = JSON.parse(value);
    return Array.isArray(images) ? images : [];
  } catch {
    return [];
  }
}

function formatProduct(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    oldPrice: row.oldPrice === null ? null : Number(row.oldPrice),
    category: row.category,
    desc: row.description || "",
    badge: row.badge || "",
    images: parseImages(row.imagesJson),
    isActive: Boolean(row.isActive)
  };
}

function validateProduct(body) {
  if (!body) {
    return { error: "No se recibieron los datos del producto." };
  }

  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.desc || body.description || "").trim();
  const badge = String(body.badge || "").trim();
  const price = Number(body.price);

  const oldPrice =
    body.oldPrice === "" ||
    body.oldPrice === null ||
    body.oldPrice === undefined
      ? null
      : Number(body.oldPrice);

  let images = [];

  if (Array.isArray(body.images)) {
    images = body.images
      .map(image => String(image).trim())
      .filter(Boolean);
  } else if (typeof body.images === "string") {
    images = body.images
      .split(/\r?\n|,/)
      .map(image => image.trim())
      .filter(Boolean);
  }

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  if (!category) {
    return { error: "La categoría es obligatoria." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "El precio no es válido." };
  }

  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice < 0)) {
    return { error: "El precio anterior no es válido." };
  }

  return {
    product: {
      name,
      price,
      oldPrice,
      category,
      description,
      badge,
      images,
      isActive: body.isActive !== false
    }
  };
}

function databaseError(context, error) {
  context.error("Error de Azure SQL:", error);

  return {
    status: 500,
    jsonBody: {
      error: "No fue posible comunicarse con la base de datos."
    }
  };
}

/* OBTENER PRODUCTOS */
app.http("getProducts", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "products",

  handler: async (request, context) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          Id AS id,
          Name AS name,
          Price AS price,
          OldPrice AS oldPrice,
          Category AS category,
          [Description] AS description,
          Badge AS badge,
          ImagesJson AS imagesJson,
          IsActive AS isActive
        FROM Products
        WHERE IsActive = 1
        ORDER BY CreatedAt DESC
      `);

      return {
        status: 200,
        jsonBody: result.recordset.map(formatProduct)
      };
    } catch (error) {
      return databaseError(context, error);
    }
  }
});

/* CREAR PRODUCTO */
app.http("createProduct", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "products",

  handler: async (request, context) => {
    try {
      let body;

      try {
        body = await request.json();
      } catch {
        return {
          status: 400,
          jsonBody: { error: "Los datos enviados no son válidos." }
        };
      }

      const validation = validateProduct(body);

      if (validation.error) {
        return {
          status: 400,
          jsonBody: { error: validation.error }
        };
      }

      const product = validation.product;
      const pool = await getPool();

      const result = await pool
        .request()
        .input("Name", sql.NVarChar(150), product.name)
        .input("Price", sql.Decimal(10, 2), product.price)
        .input("OldPrice", sql.Decimal(10, 2), product.oldPrice)
        .input("Category", sql.NVarChar(80), product.category)
        .input("Description", sql.NVarChar(500), product.description)
        .input("Badge", sql.NVarChar(80), product.badge)
        .input(
          "ImagesJson",
          sql.NVarChar(sql.MAX),
          JSON.stringify(product.images)
        )
        .input("IsActive", sql.Bit, product.isActive)
        .query(`
          INSERT INTO Products (
            Name,
            Price,
            OldPrice,
            Category,
            [Description],
            Badge,
            ImagesJson,
            IsActive
          )
          OUTPUT
            INSERTED.Id AS id,
            INSERTED.Name AS name,
            INSERTED.Price AS price,
            INSERTED.OldPrice AS oldPrice,
            INSERTED.Category AS category,
            INSERTED.[Description] AS description,
            INSERTED.Badge AS badge,
            INSERTED.ImagesJson AS imagesJson,
            INSERTED.IsActive AS isActive
          VALUES (
            @Name,
            @Price,
            @OldPrice,
            @Category,
            @Description,
            @Badge,
            @ImagesJson,
            @IsActive
          )
        `);

      return {
        status: 201,
        jsonBody: formatProduct(result.recordset[0])
      };
    } catch (error) {
      return databaseError(context, error);
    }
  }
});

/* EDITAR PRODUCTO */
app.http("updateProduct", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "products/{id}",

  handler: async (request, context) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: 400,
        jsonBody: { error: "El identificador no es válido." }
      };
    }

    try {
      let body;

      try {
        body = await request.json();
      } catch {
        return {
          status: 400,
          jsonBody: { error: "Los datos enviados no son válidos." }
        };
      }

      const validation = validateProduct(body);

      if (validation.error) {
        return {
          status: 400,
          jsonBody: { error: validation.error }
        };
      }

      const product = validation.product;
      const pool = await getPool();

      const result = await pool
        .request()
        .input("Id", sql.Int, id)
        .input("Name", sql.NVarChar(150), product.name)
        .input("Price", sql.Decimal(10, 2), product.price)
        .input("OldPrice", sql.Decimal(10, 2), product.oldPrice)
        .input("Category", sql.NVarChar(80), product.category)
        .input("Description", sql.NVarChar(500), product.description)
        .input("Badge", sql.NVarChar(80), product.badge)
        .input(
          "ImagesJson",
          sql.NVarChar(sql.MAX),
          JSON.stringify(product.images)
        )
        .input("IsActive", sql.Bit, product.isActive)
        .query(`
          UPDATE Products
          SET
            Name = @Name,
            Price = @Price,
            OldPrice = @OldPrice,
            Category = @Category,
            [Description] = @Description,
            Badge = @Badge,
            ImagesJson = @ImagesJson,
            IsActive = @IsActive,
            UpdatedAt = GETUTCDATE()
          WHERE Id = @Id;

          SELECT
            Id AS id,
            Name AS name,
            Price AS price,
            OldPrice AS oldPrice,
            Category AS category,
            [Description] AS description,
            Badge AS badge,
            ImagesJson AS imagesJson,
            IsActive AS isActive
          FROM Products
          WHERE Id = @Id;
        `);

      if (!result.recordset.length) {
        return {
          status: 404,
          jsonBody: { error: "Producto no encontrado." }
        };
      }

      return {
        status: 200,
        jsonBody: formatProduct(result.recordset[0])
      };
    } catch (error) {
      return databaseError(context, error);
    }
  }
});

/* ELIMINAR PRODUCTO */
app.http("deleteProduct", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "products/{id}",

  handler: async (request, context) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: 400,
        jsonBody: { error: "El identificador no es válido." }
      };
    }

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input("Id", sql.Int, id)
        .query(`
          DELETE FROM Products
          WHERE Id = @Id;

          SELECT @@ROWCOUNT AS affected;
        `);

      if (result.recordset[0].affected === 0) {
        return {
          status: 404,
          jsonBody: { error: "Producto no encontrado." }
        };
      }

      return {
        status: 200,
        jsonBody: { message: "Producto eliminado correctamente." }
      };
    } catch (error) {
      return databaseError(context, error);
    }
  }
});
