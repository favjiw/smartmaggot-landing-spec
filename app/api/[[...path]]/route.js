import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createToken, readAdmin } from "../../../lib/auth";
import { pool, query } from "../../../lib/db";
import { getPublicCatalog, getPublicImpact } from "../../../lib/public-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const response = (data, status = 200, headers = {}) => NextResponse.json(data, { status, headers });
const ok = (data, headers) => response({ success: true, data }, 200, headers);
const fail = (message, status = 400) => response({ success: false, message }, status);
const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-");
const productSelect = `SELECT p.*, COALESCE(SUM(sm.quantity), 0)::float AS stock,
  CASE WHEN COALESCE(SUM(sm.quantity), 0) <= 0 THEN 'Habis' WHEN COALESCE(SUM(sm.quantity), 0) <= p.low_stock_threshold THEN 'Menipis' ELSE 'Tersedia' END AS stock_status
  FROM products p LEFT JOIN stock_movements sm ON sm.product_id = p.id`;

// Tentukan jenis gambar dari isi file (magic bytes), bukan dari tipe yang dikirim browser.
function detectImageType(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function body(request) {
  return request.json().catch(() => ({}));
}

async function handler(request, context, method) {
  const { path = [] } = await context.params;
  const route = path.join("/");

  if (method === "GET" && route === "health") {
    await query("SELECT 1");
    return ok({ database: "connected" });
  }

  if (method === "POST" && route === "auth/login") {
    const input = await body(request);
    const { rows } = await query("SELECT id, name, email, password_hash FROM admins WHERE email=$1", [String(input.email ?? "").toLowerCase()]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(String(input.password ?? ""), admin.password_hash))) return fail("Email atau kata sandi salah.", 401);
    return ok({ token: createToken(admin), user: { id: admin.id, name: admin.name, email: admin.email } });
  }

  if (method === "GET" && route === "public/ringkasan") {
    const impact = await getPublicImpact();
    if (!impact) return fail("Angka dampak belum tersedia.", 503);
    return ok(impact, { "Cache-Control": "public, max-age=60" });
  }

  if (method === "GET" && route === "public/catalog") {
    const catalog = await getPublicCatalog();
    if (!catalog) return fail("Katalog belum tersedia.", 503);
    return ok(catalog, { "Cache-Control": "no-store" });
  }

  const mediaMatch = route.match(/^media\/(\d+)$/);
  if (method === "GET" && mediaMatch) {
    const { rows } = await query("SELECT mime_type,data FROM media WHERE id=$1", [mediaMatch[1]]);
    if (!rows[0]) return fail("Foto tidak ditemukan.", 404);
    return new NextResponse(new Uint8Array(rows[0].data), { headers: { "Content-Type": rows[0].mime_type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  }

  const admin = readAdmin(request);
  if (!route.startsWith("admin/") || !admin) return fail("Sesi tidak valid atau sudah berakhir.", 401);

  if (method === "POST" && route === "admin/upload") {
    const form = await request.formData().catch(() => null);
    const files = form?.getAll("photos").filter((file) => typeof file === "object" && file?.arrayBuffer) ?? [];
    if (!files.length) return fail("Pilih minimal satu foto.", 422);
    if (files.length > 10) return fail("Maksimal 10 foto sekali unggah.", 422);
    // Validasi semua foto dulu supaya tidak ada foto yang tersimpan setengah jalan.
    const prepared = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) return fail(`Foto ${file.name} lebih besar dari 2 MB.`, 422);
      const bytes = Buffer.from(await file.arrayBuffer());
      const mimeType = detectImageType(bytes);
      if (!mimeType) return fail(`${file.name} bukan foto JPG, PNG, atau WebP yang valid.`, 422);
      prepared.push({ name: file.name || "foto", mimeType, bytes });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const uploaded = [];
      for (const file of prepared) {
        const { rows } = await client.query("INSERT INTO media (file_name,mime_type,file_size,data,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id", [file.name, file.mimeType, file.bytes.length, file.bytes, admin.id]);
        uploaded.push({ id: rows[0].id, url: `/api/media/${rows[0].id}`, name: file.name });
      }
      await client.query("COMMIT");
      return response({ success: true, data: uploaded }, 201);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  if (method === "GET" && route === "admin/dashboard") {
    const [products, movements, chart] = await Promise.all([
      query(`${productSelect} GROUP BY p.id ORDER BY p.id`),
      query(`SELECT sm.id,sm.type,sm.quantity::float,sm.note,sm.created_at,p.name AS product_name,p.unit FROM stock_movements sm JOIN products p ON p.id=sm.product_id ORDER BY sm.created_at DESC LIMIT 8`),
      query(`SELECT to_char(days.day,'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN sm.quantity > 0 THEN sm.quantity ELSE 0 END),0)::float AS incoming,
        ABS(COALESCE(SUM(CASE WHEN sm.quantity < 0 THEN sm.quantity ELSE 0 END),0))::float AS outgoing
        FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') days(day)
        LEFT JOIN stock_movements sm ON sm.created_at::date = days.day::date
        GROUP BY days.day ORDER BY days.day`),
    ]);
    return ok({ products: products.rows, movements: movements.rows, chart: chart.rows });
  }

  if (method === "GET" && route === "admin/products") {
    const { rows } = await query(`${productSelect} GROUP BY p.id ORDER BY p.id`);
    return ok(rows);
  }

  if (method === "POST" && route === "admin/products") {
    const input = await body(request);
    if (!input.name || !input.description) return fail("Nama dan deskripsi wajib diisi.", 422);
    const { rows } = await query(`INSERT INTO products (slug,name,description,price,unit,photo_url,low_stock_threshold,is_visible) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [slugify(input.name), input.name, input.description, input.price || null, input.unit || "kg", input.photoUrl || null, input.lowStockThreshold ?? 5, input.isVisible ?? true]);
    return response({ success: true, data: rows[0] }, 201);
  }

  let match = route.match(/^admin\/products\/(\d+)$/);
  if (method === "PATCH" && match) {
    const input = await body(request);
    const { rows } = await query(`UPDATE products SET name=COALESCE($1,name),description=COALESCE($2,description),price=CASE WHEN $9 THEN $3 ELSE price END,unit=COALESCE($4,unit),photo_url=COALESCE($5,photo_url),low_stock_threshold=COALESCE($6,low_stock_threshold),is_visible=COALESCE($7,is_visible),updated_at=now() WHERE id=$8 RETURNING *`, [input.name, input.description, input.price === "" ? null : input.price, input.unit, input.photoUrl, input.lowStockThreshold, input.isVisible, match[1], "price" in input]);
    return rows[0] ? ok(rows[0]) : fail("Produk tidak ditemukan.", 404);
  }

  match = route.match(/^admin\/products\/(\d+)\/stock$/);
  if (method === "GET" && match) {
    const [product, movements] = await Promise.all([
      query(`${productSelect} WHERE p.id=$1 GROUP BY p.id`, [match[1]]),
      query("SELECT sm.*,a.name AS created_by_name FROM stock_movements sm LEFT JOIN admins a ON a.id=sm.created_by WHERE product_id=$1 ORDER BY created_at DESC", [match[1]]),
    ]);
    return product.rows[0] ? ok({ product: product.rows[0], movements: movements.rows }) : fail("Produk tidak ditemukan.", 404);
  }

  if (method === "POST" && match) {
    const input = await body(request);
    const type = String(input.type ?? "").toUpperCase();
    let quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity === 0 || !["MASUK", "KELUAR", "PENYESUAIAN"].includes(type)) return fail("Tipe dan jumlah pergerakan tidak valid.", 422);
    if (type === "MASUK") quantity = Math.abs(quantity);
    if (type === "KELUAR") quantity = -Math.abs(quantity);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT id FROM products WHERE id=$1 FOR UPDATE", [match[1]]);
      if (!locked.rows[0]) { await client.query("ROLLBACK"); return fail("Produk tidak ditemukan.", 404); }
      const current = await client.query("SELECT COALESCE(SUM(quantity),0)::float stock FROM stock_movements WHERE product_id=$1", [match[1]]);
      if (Number(current.rows[0].stock) + quantity < 0) { await client.query("ROLLBACK"); return fail(`Stok tidak cukup. Stok saat ini ${current.rows[0].stock} kg.`, 409); }
      const { rows } = await client.query("INSERT INTO stock_movements (product_id,type,quantity,note,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *", [match[1], type, quantity, input.note || null, admin.id]);
      await client.query("COMMIT");
      return response({ success: true, data: rows[0] }, 201);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  if (method === "GET" && route === "admin/activities") {
    const { rows } = await query("SELECT * FROM activities ORDER BY activity_date DESC");
    return ok(rows);
  }

  if (method === "POST" && route === "admin/activities") {
    const input = await body(request);
    if (!input.title || !input.activityDate || !input.summary || !input.content) return fail("Lengkapi semua field wajib.", 422);
    const { rows } = await query(`INSERT INTO activities (slug,title,category,activity_date,summary,content,photos,is_published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [slugify(input.title), input.title, input.category || "Kegiatan Warga", input.activityDate, input.summary, input.content, input.photos || [], input.isPublished ?? false]);
    return response({ success: true, data: rows[0] }, 201);
  }

  match = route.match(/^admin\/activities\/(\d+)$/);
  if (method === "PATCH" && match) {
    const input = await body(request);
    const { rows } = await query(`UPDATE activities SET title=COALESCE($1,title),category=COALESCE($2,category),activity_date=COALESCE($3,activity_date),summary=COALESCE($4,summary),content=COALESCE($5,content),photos=COALESCE($6,photos),is_published=COALESCE($7,is_published),updated_at=now() WHERE id=$8 RETURNING *`, [input.title, input.category, input.activityDate, input.summary, input.content, input.photos, input.isPublished, match[1]]);
    return rows[0] ? ok(rows[0]) : fail("Kegiatan tidak ditemukan.", 404);
  }
  if (method === "DELETE" && match) {
    await query("DELETE FROM activities WHERE id=$1", [match[1]]);
    return new NextResponse(null, { status: 204 });
  }

  if (method === "GET" && route === "admin/settings") {
    const { rows } = await query("SELECT * FROM site_settings WHERE id=1");
    return ok(rows[0]);
  }
  if (method === "PUT" && route === "admin/settings") {
    const input = await body(request);
    if (!/^\d{10,16}$/.test(input.whatsapp ?? "")) return fail("Nomor WhatsApp harus 10–16 digit.", 422);
    const { rows } = await query(`UPDATE site_settings SET partner_name=$1,whatsapp=$2,email=$3,address=$4,operational_hours=$5,description=$6,show_catalog=$7,show_stock_status=$8,default_unit=$9,updated_at=now() WHERE id=1 RETURNING *`, [input.partnerName, input.whatsapp, input.email || null, input.address, input.operationalHours, input.description, input.showCatalog, input.showStockStatus, input.defaultUnit]);
    return ok(rows[0]);
  }
  if (method === "PUT" && route === "admin/impact") {
    const input = await body(request);
    const { rows } = await query(`UPDATE impact_stats SET total_waste_kg=$1,processing_count=$2,cycle_count=$3,harvest_cycle_count=$4,updated_at=now() WHERE id=1 RETURNING *`, [input.totalWasteKg, input.processingCount, input.cycleCount, input.harvestCycleCount]);
    return ok(rows[0]);
  }

  return fail("Endpoint tidak ditemukan.", 404);
}

async function safeHandler(request, context, method) {
  try { return await handler(request, context, method); }
  catch (error) {
    console.error(error);
    return fail(error.code === "23505" ? "Data dengan nama/slug tersebut sudah ada." : "Terjadi kesalahan pada server.", error.code === "23505" ? 409 : 500);
  }
}

export const GET = (request, context) => safeHandler(request, context, "GET");
export const POST = (request, context) => safeHandler(request, context, "POST");
export const PATCH = (request, context) => safeHandler(request, context, "PATCH");
export const PUT = (request, context) => safeHandler(request, context, "PUT");
export const DELETE = (request, context) => safeHandler(request, context, "DELETE");
