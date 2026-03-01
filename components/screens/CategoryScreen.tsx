"use client";

import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useApp, Product } from "@/lib/store";

const ALL_PRODUCTS: Product[] = [
  { id: "c1", name: "Rose Signature Cake", price: 450000, image: "/images/cake-1.jpg", type: "cake", description: "Single-tier with white fondant and rose decor" },
  { id: "c2", name: "Dark Chocolate Mousse", price: 380000, image: "/images/cake-2.jpg", type: "cake", description: "Glossy ganache with fresh berry topping" },
  { id: "c3", name: "Strawberry Chiffon", price: 320000, image: "/images/cake-3.jpg", type: "cake", description: "Light chiffon with whipped cream and strawberries" },
  { id: "c4", name: "Grand Tiered Wedding", price: 1200000, image: "/images/cake-4.jpg", type: "cake", description: "Elegant tiered cake with buttercream rosettes" },
  { id: "i1", name: "Premium Almond Flour", price: 85000, image: "/images/ing-1.jpg", type: "ingredient", description: "500g · France · Fine-ground blanched almonds" },
  { id: "i2", name: "Dark Couverture Chocolate", price: 120000, image: "/images/ing-2.jpg", type: "ingredient", description: "300g · Belgium · 72% cacao" },
  { id: "i3", name: "Pure Vanilla Extract", price: 95000, image: "/images/ing-3.jpg", type: "ingredient", description: "100ml · Madagascar · Organic" },
];

type SortOption = "popular" | "newest" | "price-asc" | "price-desc";
const SORT_LABELS: Record<SortOption, string> = {
  popular: "Most Popular",
  newest: "Newest First",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

const PRICE_FILTERS = ["All", "Under 100k", "100k – 300k", "300k – 600k", "Above 600k"];
const BRANDS = ["All", "Valrhona", "Nielsen-Massey", "Bob's Red Mill"];

export default function CategoryScreen() {
  const { navigate, selectedCategory, selectProduct } = useApp();
  const [sort, setSort] = useState<SortOption>("popular");
  const [priceFilter, setPriceFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");

  const products = ALL_PRODUCTS.filter((p) => p.type === selectedCategory);
  const sorted = [...products].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return 0;
  });

  const title = selectedCategory === "cake" ? "Signature Cakes" : "Baking Ingredients";
  const subtitle = selectedCategory === "cake"
    ? "Handcrafted to order, every cake is made with premium ingredients and artisan care."
    : "Professional-grade baking ingredients sourced from trusted suppliers worldwide.";

  return (
    <div className="bg-background">
      {/* Page header */}
      <div className="border-b border-border/60 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ChevronLeft size={16} />
            Back to Home
          </button>
          <h1 className="font-serif text-4xl font-semibold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex gap-10">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            {/* Sort */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Sort By</p>
              <div className="space-y-1">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSort(val)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      sort === val
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price filter */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Price Range</p>
              <div className="space-y-1">
                {PRICE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPriceFilter(f)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      priceFilter === f
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand (ingredients only) */}
            {selectedCategory === "ingredient" && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Brand</p>
                <div className="space-y-1">
                  {BRANDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBrandFilter(b)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        brandFilter === b
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile sort chips */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSort(val)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sort === val ? "bg-primary text-white border-primary" : "border-border text-muted-foreground bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">{sorted.length} products</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {sorted.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className="bg-card rounded-2xl overflow-hidden border border-border/50 text-left hover:shadow-lg hover:border-border transition-all duration-300 group"
              >
                <div className="relative w-full overflow-hidden bg-secondary" style={{ paddingBottom: "100%" }}>
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <p className="font-sans text-sm font-semibold text-foreground leading-snug text-balance">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">{p.description}</p>
                  )}
                  <p className="font-sans text-base font-bold text-accent mt-2.5">{p.price.toLocaleString("vi-VN")}đ</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
