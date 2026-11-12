import jwt from "jsonwebtoken";

function secret() {
  const value = process.env.JWT_SECRET;
  if (value && value.length >= 32) return value;
  // Secret bawaan hanya untuk development. Di produksi, token admin bisa dipalsukan jika secret mudah ditebak.
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET wajib diisi minimal 32 karakter.");
  return value || "development-only-secret-change-this";
}

export function createToken(admin) {
  return jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, secret(), { expiresIn: "12h" });
}

export function readAdmin(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try { return jwt.verify(token, secret()); } catch { return null; }
}
