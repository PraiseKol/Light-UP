import { useState } from "react";
import { adjustTalents, adjustPowerupInventory } from "utils/talentUtils";

export default function PowerUpStore({ gameUser, onPurchase }) {
  const [loading, setLoading] = useState(false);

  const powerUps = [
    {
      key: "divine_hint",
      name: "Divine Hint",
      description: "Reveals a helpful hint in your current challenge.",
      icon: "🧩",
      costs: { one: 5, three: 12 }
    },
    {
      key: "grace_period",
      name: "Grace Period",
      description: "Adds +10 seconds to the timer.",
      icon: "⏳",
      costs: { one: 8, three: 20 }
    },
    {
      key: "holy_shield",
      name: "Holy Shield",
      description: "Protects from life loss for 5 mins (Main Game only).",
      icon: "🛡️",
      costs: { one: 10, three: 26 }
    },
    {
      key: "heavenly_match",
      name: "Heavenly Match",
      description: "Automatically solves the current question.",
      icon: "✨",
      costs: { one: 15, three: 40 }
    }
  ];

  const handlePurchase = async (powerup, bundle) => {
    const cost = powerup.costs[bundle];
    const quantity = bundle === "one" ? 1 : 3;

    if (gameUser.talents < cost) {
      alert("Not enough talents to purchase this power-up.");
      return;
    }

    setLoading(true);
    try {
      await adjustTalents(gameUser.user_id, -cost);
      await adjustPowerupInventory(gameUser.user_id, powerup.key, quantity);
      alert(`You bought ${quantity}x ${powerup.name}!`);
      if (onPurchase) onPurchase();
    } catch (err) {
      console.error("Purchase failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-100">
      <h2 className="text-2xl font-extrabold mb-3 text-blue-700 text-center">
         Power-Up Store
      </h2>
      <p className="text-center text-sm text-gray-500 mb-6">
        Exchange your talents for divine advantages (bonuses).
      </p>

      <div className="text-right text-sm mb-4">
        <span className="font-semibold text-gray-700">Your Talents:</span>{" "}
        <span className="text-blue-600 font-bold">{gameUser?.talents ?? 0}</span>
      </div>

      <div className="space-y-4">
        {powerUps.map((pu) => (
          <div
            key={pu.key}
            className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <span className="text-xl">{pu.icon}</span>
                {pu.name}
              </div>
              <p className="text-sm text-gray-600">{pu.description}</p>
            </div>

            <div className="flex gap-2">
              <button
                disabled={loading || gameUser.talents < pu.costs.one}
                onClick={() => handlePurchase(pu, "one")}
                className="px-2 py-1 text-sm  bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-300"
              >
                1x for {pu.costs.one} 💡
              </button>
              <button
                disabled={loading || gameUser.talents < pu.costs.three}
                onClick={() => handlePurchase(pu, "three")}
                className="px-2 py-1 text-sm  bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-300"
              >
                3x for{pu.costs.three} 💡
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
