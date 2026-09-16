"use client";
import { useState } from "react";

export default function AddToCart({ product }: { product: { id: string; name: string; price: number; currency: string } }) {
  const [added, setAdded] = useState(false);
  function add() {
    const current = JSON.parse(localStorage.getItem("masjidfinder-cart") ?? "[]") as any[];
    const item = current.find((entry) => entry.id === product.id);
    if (item) item.quantity += 1; else current.push({ ...product, quantity: 1 });
    localStorage.setItem("masjidfinder-cart", JSON.stringify(current));
    window.dispatchEvent(new Event("masjidfinder-cart-updated"));
    setAdded(true);
  }
  return <button onClick={add} className="flex-1 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white">{added ? "Added" : "Add"}</button>;
}