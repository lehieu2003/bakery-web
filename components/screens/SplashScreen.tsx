"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

export default function SplashScreen() {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("home");
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background animate-fade-in">
      {/* Subtle decorative ring */}
      <div className="absolute w-64 h-64 rounded-full border border-border/40" />
      <div className="absolute w-80 h-80 rounded-full border border-border/20" />

      {/* Logo mark */}
      <div className="relative flex flex-col items-center gap-5 z-10">
        <div className="flex flex-col items-center">
          {/* Monogram icon */}
          <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4">
            <span className="font-serif text-primary text-2xl font-semibold tracking-wider">L</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-[0.12em] text-foreground uppercase">
            La Douceur
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="h-px w-10 bg-primary/40" />
            <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase font-sans font-light">
              Artisan Bakery
            </p>
            <span className="h-px w-10 bg-primary/40" />
          </div>
        </div>

        <p className="font-serif italic text-muted-foreground text-sm tracking-wide mt-2">
          Handcrafted Cakes for Every Celebration
        </p>
      </div>

      {/* Bottom dot indicator */}
      <div className="absolute bottom-16 flex gap-1.5">
        <span className="w-4 h-1 rounded-full bg-primary" />
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="w-1 h-1 rounded-full bg-border" />
      </div>
    </div>
  );
}
