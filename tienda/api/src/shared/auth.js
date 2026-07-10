// Azure Static Web Apps manda info del usuario logueado en el header
// "x-ms-client-principal" (base64 JSON) cuando la ruta requiere autenticación.
// Lo validamos aquí para asegurarnos que solo tú (rol "administrador") puedas
// crear/editar/borrar productos.

function getUser(request) {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("ascii");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isAdmin(request) {
  const user = getUser(request);
  return !!user && Array.isArray(user.userRoles) && user.userRoles.includes("administrador");
}

module.exports = { getUser, isAdmin };
