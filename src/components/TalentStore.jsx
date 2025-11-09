import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "utils/sound";

export default function TalentStore({ gameUser, onPurchase, effectsOn }) {
  const [loadingButton, setLoadingButton] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("NGN"); // default currency

  // Talent price options (price in NGN and USD)
  const talentOptions = [
    { talents: 100, priceNGN: 750, priceUSD: 0.5 },
    { talents: 500, priceNGN: 3000, priceUSD: 2.0 },
  ];

  const handleBuyTalentsWithMoney = async (talents, price, currency) => {
    playSound("click", effectsOn);
    setLoadingButton(talents);
    try {
      const baseUrl = process.env.REACT_APP_PAYMENT_API;
      const res = await fetch(`${baseUrl}/api/create-payment-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: gameUser.user_id,
          talents,
          price,
          currency,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Payment session failed to start.");
      }
    } catch (err) {
      console.error("Payment start error:", err);
      alert("Failed to start payment.");
    } finally {
      setLoadingButton(null);
    }
  };

  const handleBuyLivesWithTalents = async (cost, lives) => {
    if (gameUser.talents < cost) {
      alert("Not enough talents to buy lives.");
      return;
    }
    if (!window.confirm(`Spend ${cost} talents for ${lives} lives?`)) return;

    playSound("click", effectsOn);
    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_PAYMENT_API;
      const res = await fetch(`${baseUrl}/api/adjust-talents`, {
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

      await supabase
        .from("game_users")
        .update({ lives, updated_at: new Date().toISOString() })
        .eq("user_id", gameUser.user_id);

      alert(`You bought ${lives} lives successfully!`);
      if (onPurchase) onPurchase();
    } catch (err) {
      console.error("Life purchase failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-xl md:max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-yellow-100">
      <div className="space-y-2 md:space-y-4 mb-2 md:mb-5">
        <h2 className="text-sm md:text-2xl font-extrabold mb-3 text-yellow-700 text-center">
          Talent Store
        </h2>
        <p className="text-center text-xs md:text-sm text-gray-500 mb-6">
          Top up your talents and lives here.
        </p>
        <p className="text-center text-[10px] md:text-xs text-gray-500 mb-6">
          (USD payment option coming soon)
        </p>

        <div className="flex justify-center mb-4">
          <label className="mr-2 font-semibold text-gray-700 text-[11px] md:text-lg">Currency:</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="NGN">NGN</option>
            {/* <option value="USD">USD</option> */}
          </select>
        </div>

        <div className="text-right text-xs md:text-sm mb-4">
          <span className="font-semibold text-gray-700">Your Talents:</span>{" "}
          <span className="text-yellow-600 font-bold">💎 {gameUser?.talents ?? 0}</span>
        </div>

        {/* Money → Talents */}
        {talentOptions.map(({ talents, priceNGN, priceUSD }) => {
          const price = currency === "NGN" ? priceNGN : priceUSD;
          const display = currency === "NGN" ? `₦${price}` : `$${price.toFixed(2)}`;
          return (
            <div
              key={talents}
              className={` text-[10px] md:text-sm flex justify-between items-center p-2 md:p-4 mb-1 md:mb-2 rounded-xl shadow-sm ${
                talents === 100 ? "bg-blue-50 border border-blue-200" : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <div>
                <p className={`text-[10px] md:text-sm font-semibold ${talents === 100 ? "text-blue-900" : "text-yellow-900"}`}>
                  💎 {talents} Talents
                </p>
                <p className="text-[10px] md:text-sm text-gray-600">{display}</p>
              </div>
              <button
                disabled={loadingButton === talents}
                onClick={() => handleBuyTalentsWithMoney(talents, price, currency)}
                className={`px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-sm ${
                  talents === 100 ? "bg-blue-600 hover:bg-blue-500" : "bg-yellow-600 hover:bg-yellow-500"
                } text-white rounded flex items-center gap-2`}
              >
                {loadingButton === talents ? (
                  <span className="w-4 h-4 text-[10px] md:text-sm border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Buy"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Talents → Lives */}
      <div className="space-y-4">
        <div className="text-[10px] md:text-sm flex justify-between items-center bg-green-50 border border-green-200 p-2 md:p-4 rounded-xl shadow-sm">
          <div className="">
            <p className="font-semibold text-green-900">Full ❤️ Lives</p>
            <p className=" text-gray-600">💎 50 Talents</p>
          </div>
          <button
            disabled={loading || gameUser.talents < 50}
            onClick={() => handleBuyLivesWithTalents(50, 5)}
            className="px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-sm bg-green-600 hover:bg-green-500 text-white rounded disabled:bg-gray-300 flex items-center gap-2"
          >
            {loading ? (
              <span className="text-[10px] md:text-sm w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Buy"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
