// components/PowerUpStore.jsx
import { useState } from "react";
import { adjustTalents, adjustPowerupInventory } from "utils/talentUtils";

export default function PowerUpStore({ gameUser, onPurchase }) {
  const [loading, setLoading] = useState(false);

  const powerUps = [
    {
      key: "divine_hint",
      name: "Divine Hint",
      description: "Reveals a hint in the current question",
      costs: { one: 5, three: 12 }
    },
    {
      key: "grace_period",
      name: "Grace Period",
      description: "+10 seconds to the timer",
      costs: { one: 8, three: 20 }
    },
    {
      key: "holy_shield",
      name: "Holy Shield",
      description: "5 minutes without life loss (Main Game only)",
      costs: { one: 10, three: 26 }
    },
    {
      key: "heavenly_match",
      name: "Heavenly Match",
      description: "Instantly solves the current question",
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
      // Deduct talents
      await adjustTalents(gameUser.user_id, -cost);

      // Add to inventory
      await adjustPowerupInventory(gameUser.user_id, powerup.key, quantity);

      alert(`Purchased ${quantity}x ${powerup.name}!`);
      if (onPurchase) onPurchase(); // refresh parent state
    } catch (err) {
      console.error("Error purchasing power-up:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Power-Up Store</h2>
      <div className="mb-4">
        <span className="font-semibold">Your Talents:</span> {gameUser?.talents ?? 0}
      </div>

      <div className="space-y-4">
        {powerUps.map((pu) => (
          <div
            key={pu.key}
            className="border p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-bold">{pu.name}</div>
              <div className="text-sm text-gray-600">{pu.description}</div>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button
                disabled={loading || gameUser.talents < pu.costs.one}
                onClick={() => handlePurchase(pu, "one")}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                1x ({pu.costs.one} Talents)
              </button>
              <button
                disabled={loading || gameUser.talents < pu.costs.three}
                onClick={() => handlePurchase(pu, "three")}
                className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-gray-400"
              >
                3x ({pu.costs.three} Talents)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
