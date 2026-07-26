import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/utils/sound";
import { toast } from "sonner";

export default function TalentStore({ gameUser, onPurchase, effectsOn }) {
  const [loadingButton, setLoadingButton] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("NGN");

  // Price options
  const talentOptions = [
    { talents: 100, priceNGN: 750, priceUSD: 0.5 },
    { talents: 500, priceNGN: 3000, priceUSD: 2.0 },
  ];

  // 🔥 Use VITE_ variable correctly
  const PAYMENT_BASE_URL = import.meta.env.VITE_PAYMENT_API;

  const handleBuyTalentsWithMoney = async (talents, price, currency) => {
    playSound("click", effectsOn);
    setLoadingButton(talents);

    try {
      const res = await fetch(`${PAYMENT_BASE_URL}/api/create-payment-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: gameUser.user_id,
          talents,
          price,
          currency,
        }),
      });

      if (!res.ok) {
        console.error("Server returned:", res.status, res.statusText);
        toast.error("Payment failed. Server error.");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data?.url) {
        toast.error("Payment session failed to start.");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Payment start error:", err);
      toast.error("Failed to start payment.");
    } finally {
      setLoadingButton(null);
    }
  };

  const handleBuyLivesWithTalents = async (cost, lives) => {
    if (gameUser.talents < cost) {
      toast.error("Not enough talents to buy lives.");
      return;
    }

    if (!window.confirm(`Spend ${cost} talents for ${lives} lives?`)) return;

    playSound("click", effectsOn);
    setLoading(true);

    try {
      const res = await fetch(`${PAYMENT_BASE_URL}/api/adjust-talents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: gameUser.user_id,
          amount: -cost,
          transactionId: `lives-${Date.now()}`,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error("Failed to deduct talents");

      await supabase.rpc("refill_lives", { p_user_id: gameUser.user_id });

      toast.success(`You bought ${lives} lives!`);
      onPurchase?.();
    } catch (err) {
      console.error("Life purchase failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-3d p-4 md:p-6 max-w-xl md:max-w-2xl mx-auto">
      <div className="space-y-2 md:space-y-4 mb-3 md:mb-5">
        <h2 className="text-lg md:text-2xl font-extrabold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent text-center">
          💎 Talent Store
        </h2>
        <p className="text-center text-xs md:text-sm text-purple-700/70">
          Top up your talents and lives here.
        </p>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-purple-900 text-xs md:text-sm">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border-2 border-purple-200 bg-white px-2 py-1 rounded-lg text-xs md:text-sm font-bold text-purple-900"
            >
              <option value="NGN">NGN</option>
            </select>
          </div>
          <span className="chip-3d chip-3d-star text-xs">💎 {gameUser?.talents ?? 0}</span>
        </div>

        {/* Money → Talents */}
        {talentOptions.map(({ talents, priceNGN, priceUSD }) => {
          const price = currency === "NGN" ? priceNGN : priceUSD;
          const display = currency === "NGN" ? `₦${price}` : `$${price.toFixed(2)}`;
          return (
            <div key={talents} className="row-3d">
              <span className={`icon-orb ${talents === 100 ? "" : "yellow"}`}>💎</span>
              <div className="flex-1">
                <p className="text-sm md:text-base font-extrabold text-purple-900">
                  {talents} Talents
                </p>
                <p className="text-[11px] md:text-xs text-purple-700/70">{display}</p>
              </div>
              <button
                disabled={loadingButton === talents}
                onClick={() => handleBuyTalentsWithMoney(talents, price, currency)}
                className={`btn-orb ${talents === 100 ? "btn-orb-blue" : "btn-orb-yellow"} px-3 py-1.5 text-xs md:text-sm flex items-center gap-2`}
              >
                {loadingButton === talents ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Buy"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Talents → Lives */}
      <div className="row-3d">
        <span className="icon-orb red">❤️</span>
        <div className="flex-1">
          <p className="text-sm md:text-base font-extrabold text-purple-900">Full Lives</p>
          <p className="text-[11px] md:text-xs text-purple-700/70">💎 50 Talents · 5 lives</p>
        </div>
        <button
          disabled={loading || gameUser.talents < 50}
          onClick={() => handleBuyLivesWithTalents(50, 5)}
          className="btn-orb btn-orb-green px-3 py-1.5 text-xs md:text-sm flex items-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Buy"
          )}
        </button>
      </div>
    </div>
  );
}
