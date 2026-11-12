import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET ?? "development-only-secret-change-this";

export function createToken(admin) {
  return jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, secret(), { expiresIn: "12h" });
}

export function readAdmin(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try { return jwt.verify(token, secret()); } catch { return null; }
}
