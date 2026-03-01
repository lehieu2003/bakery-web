"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useApp, Product } from "@/lib/store";
import MembershipCard from "@/components/ui-custom/MembershipCard";

const CAKES: Product[] = [
  { id: "c1", name: "Rose Signature Cake", price: 450000, image: "/images/cake-1.jpg", type: "cake", description: "Single-tier with white fondant and rose decor" },
  { id: "c2", name: "Dark Chocolate Mousse", price: 380000, image: "/images/cake-2.jpg", type: "cake", description: "Glossy ganache with fresh berry topping" },
  { id: "c3", name: "Strawberry Chiffon", price: 320000, image: "/images/cake-3.jpg", type: "cake", description: "Light chiffon with whipped cream and strawberries" },
  { id: "c4", name: "Grand Tiered Wedding", price: 1200000, image: "/images/cake-4.jpg", type: "cake", description: "Elegant tiered cake with buttercream rosettes" },
];

const INGREDIENTS: Product[] = [
  { id: "i1", name: "Premium Almond Flour", price: 85000, image: "/images/ing-1.jpg", type: "ingredient", weight: "500g", origin: "France" },
  { id: "i2", name: "Dark Couverture Chocolate", price: 120000, image: "/images/ing-2.jpg", type: "ingredient", weight: "300g", origin: "Belgium" },
  { id: "i3", name: "Pure Vanilla Extract", price: 95000, image: "/images/ing-3.jpg", type: "ingredient", weight: "100ml", origin: "Madagascar" },
];

export default function HomeScreen() {
  const { user, navigate, selectProduct, setCategory } = useApp();

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative h-[560px] lg:h-[640px] w-full overflow-hidden">
        <Image
          src="/images/hero-cake.jpg"
          alt="Signature hero cake"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/65 via-foreground/30 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <p className="text-white/70 text-xs tracking-[0.28em] uppercase font-sans font-light mb-4">
                New Collection · 2025
              </p>
              <h1 className="font-serif text-4xl lg:text-6xl font-semibold text-white leading-tight text-balance mb-6">
                Celebrate Every<br />Moment With<br />Our Signature Cakes
              </h1>
              <p className="text-white/75 text-base font-sans font-light leading-relaxed mb-8 max-w-sm">
                Handcrafted with premium ingredients, each cake is a work of art made to order.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCategory("cake")}
                  className="px-8 py-3.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Explore Cakes
                </button>
                <button
                  onClick={() => setCategory("ingredient")}
                  className="px-8 py-3.5 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/25 transition-colors border border-white/30"
                >
                  Shop Ingredients
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Banner */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {user ? (
          <div className="max-w-xl">
            <MembershipCard user={user} />
          </div>
        ) : (
          <div
            className="rounded-2xl border border-border bg-card px-6 py-5 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors group"
            onClick={() => navigate("profile")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("profile")}
            aria-label="Join membership"
          >
            <div>
              <p className="font-serif text-base font-semibold text-foreground">Join Our Membership Club</p>
              <p className="text-muted-foreground text-sm mt-0.5">Enjoy exclusive rewards and up to 15% off every order.</p>
            </div>
            <span className="flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all">
              Join now <ArrowRight size={16} />
            </span>
          </div>
        )}
      </section>

      {/* Signature Cakes */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground font-sans font-light mb-1.5">Our Speciality</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Signature Cakes</h2>
          </div>
          <button
            onClick={() => setCategory("cake")}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {CAKES.map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => selectProduct(p)} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px bg-border" />
      </div>

      {/* Baking Ingredients */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground font-sans font-light mb-1.5">Premium Selection</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Baking Ingredients</h2>
          </div>
          <button
            onClick={() => setCategory("ingredient")}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {INGREDIENTS.map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => selectProduct(p)} />
          ))}
        </div>
      </section>

      {/* Value strip */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { heading: "Made to Order", body: "Every cake is baked fresh specifically for your celebration, never off the shelf." },
            { heading: "Premium Ingredients", body: "We source only the finest couverture chocolate, French butter, and organic eggs." },
            { heading: "Loyalty Rewards", body: "Earn points on every order and unlock exclusive discounts at Gold and Platinum level." },
          ].map(({ heading, body }) => (
            <div key={heading} className="flex flex-col gap-2">
              <h3 className="font-serif text-base font-semibold text-foreground">{heading}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="bg-card rounded-2xl overflow-hidden border border-border/50 text-left hover:shadow-lg hover:border-border transition-all duration-300 group"
    >
      <div className="relative w-full overflow-hidden bg-secondary" style={{ paddingBottom: "100%" }}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <p className="font-sans text-sm font-semibold text-foreground leading-snug text-balance">{product.name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">{product.description}</p>
        )}
        <p className="font-sans text-base font-bold text-accent mt-2.5">{product.price.toLocaleString("vi-VN")}đ</p>
      </div>
    </button>
  );
}
