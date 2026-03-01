"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export default function SuccessScreen() {
  const { user, navigate, orderNumber } = useApp();
  const [showPoints, setShowPoints] = useState(false);
  const pointsEarned = 120;
  const nextLevelPoints = user?.level === "gold" ? 60 : user?.level === "silver" ? 80 : 0;

  useEffect(() => {
    const t = setTimeout(() => setShowPoints(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-background min-h-[70vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg mx-auto">
        {/* Check icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div
              className="absolute inset-0 w-20 h-20 rounded-full border border-primary/15 scale-125 animate-ping"
              style={{ animationDuration: "2.2s" }}
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">Order Confirmed</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Your order has been placed successfully. We will prepare it with care and love.
          </p>
        </div>

        {/* Order card */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-4">
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Order Number</span>
            <span className="font-serif text-base font-semibold text-foreground">#{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Estimated Pickup</span>
            <span className="text-sm font-semibold text-foreground">25/03 · 17:00</span>
          </div>
        </div>

        {/* Points earned */}
        {user && (
          <div
            className={`bg-primary/8 border border-primary/20 rounded-2xl p-5 mb-4 transition-all duration-700 ${
              showPoints ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-serif text-sm font-semibold text-primary">Points Earned</p>
              <span className="font-serif text-2xl font-bold text-primary">+{pointsEarned}</span>
            </div>
            {nextLevelPoints > 0 && (
              <p className="text-xs text-muted-foreground">
                You are {nextLevelPoints} points away from{" "}
                {user.level === "gold" ? "Platinum" : "Gold"} membership.
              </p>
            )}
            {user.level === "platinum" && (
              <p className="text-xs text-muted-foreground">You are at our highest tier. Thank you for your loyalty.</p>
            )}
          </div>
        )}

        {/* Guest nudge */}
        {!user && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              <button onClick={() => navigate("profile")} className="text-primary font-medium underline underline-offset-2">
                Create an account
              </button>{" "}
              to start earning rewards on your next order.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("home")}
            className="flex-1 py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={() => navigate("profile")}
            className="flex-1 py-4 border border-border text-foreground rounded-full font-medium text-sm hover:bg-secondary transition-colors"
          >
            View Order History
          </button>
        </div>
      </div>
    </div>
  );
}
