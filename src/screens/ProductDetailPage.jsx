"use client";

import NextLink from "next/link";
import { Footer, Header, Photo, WhatsAppIcon, formatPrice, productMessage, useWaLink } from "../components";
import { usePublicData } from "../api";

const Link = ({ to, ...props }) => <NextLink href={to} {...props} />;

export function ProductDetailPage({ slug }) {
  const { products, settings } = usePublicData();
  const wa = useWaLink();
  // Slug sudah divalidasi di server (404 jika tidak ada).
  const product = products.find((item) => item.slug === slug) ?? products[0];
  const others = products.filter((item) => item.slug !== product.slug);
  return <><Header /><main className="detail-page"><div className="article-shell product-detail">
    <p className="breadcrumbs"><Link to="/">Beranda</Link> / <Link to="/#produk">Produk</Link> / <b>{product.name}</b></p><Link className="back-link" to="/#produk">← Kembali ke katalog</Link>
    <figure className="hero-figure"><Photo src={product.photo_url} className="detail-hero" alt={product.name} /></figure>
    <div className="product-detail-info">
      {settings?.show_stock_status !== false && <span className={product.stock_status === "Tersedia" ? "status" : "status preorder"}>{product.stock_status ?? product.status}</span>}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <strong>{product.price ? <>Rp {formatPrice(product.price)} <small>/ {product.unit}</small></> : "Tanya harga"}</strong>
      <a className="button" href={wa(productMessage(product))} target="_blank" rel="noreferrer"><WhatsAppIcon /> Pesan via WhatsApp</a>
    </div>
    {others.length > 0 && <p className="product-detail-others">Produk lain: {others.map((item, i) => <span key={item.slug}>{i > 0 && " · "}<Link to={`/produk/${item.slug}`}>{item.name}</Link></span>)}</p>}
  </div></main><Footer /></>;
}
