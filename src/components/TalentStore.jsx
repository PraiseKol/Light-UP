import { useState } from "react";
import { supabase } from "lib/supabaseClient";
import { playSound } from "utils/sound"; // import sound utility

export default function TalentStore({ gameUser, onPurchase, effectsOn }) {
  const [loadingButton, setLoadingButton] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBuyTalentsWithMoney = async (talents, price) => {
    playSound("click", effectsOn); // 🔊 play sound on click
    setLoadingButton(talents);
    try {
      const baseUrl = process.env.REACT_APP_PAYMENT_API;
      const res = await fetch(`${baseUrl}/api/create-payment-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: gameUser.user_id, talents, price }),
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

    playSound("click", effectsOn); // 🔊 play sound on click

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
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-yellow-100">
      {/* Talent Store header */}
      <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-extrabold mb-3 text-yellow-700 text-center">
          Talent Store
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Top up your talents and lives here.
        </p>

        <div className="text-right text-sm mb-4">
          <span className="font-semibold text-gray-700">Your Talents:</span>{" "}
          <span className="text-yellow-600 font-bold">💎 {gameUser?.talents ?? 0}</span>
        </div>

        {/* Money → Talents */}
        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
          <div>
            <p className="font-semibold text-blue-900">💎 100 Talents</p>
            <p className="text-sm text-gray-600">₦750 / $0.50</p>
          </div>
          <button
            disabled={loadingButton === 100}
            onClick={() => handleBuyTalentsWithMoney(100, 750)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-2"
          >
            {loadingButton === 100 ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Buy"
            )}
          </button>
        </div>

        <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-sm">
          <div>
            <p className="font-semibold text-yellow-900">💎 500 Talents</p>
            <p className="text-sm text-gray-600">₦3000 / $2.00</p>
          </div>
          <button
            disabled={loadingButton === 500}
            onClick={() => handleBuyTalentsWithMoney(500, 3000)}
            className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded flex items-center gap-2"
          >
            {loadingButton === 500 ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Buy"
            )}
          </button>
        </div>
      </div>

      {/* Talents → Lives */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm">
          <div>
            <p className="font-semibold text-green-900">Full ❤️ Lives</p>
            <p className="text-sm text-gray-600">💎 50 Talents</p>
          </div>
          <button
            disabled={loading || gameUser.talents < 50}
            onClick={() => handleBuyLivesWithTalents(50, 5)}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded disabled:bg-gray-300 flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Buy"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
