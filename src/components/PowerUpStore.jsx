import { useState } from "react";
import { adjustTalents, adjustPowerupInventory } from "utils/talentUtils";
import TalentStore from "components/TalentStore";
import BonusesTab from "components/BonusesTab";
import { playSound } from "utils/sound";

export default function PowerUpStore({
  gameUser,
  user,
  onPurchase,
  effectsOn,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("powerups");

  const powerUps = [
    {
      key: "divine_hint",
      name: "Divine Hint",
      description: "Reveals a helpful hint in your current challenge.",
      icon: "🧩",
      costs: { one: 5, three: 12 },
    },
    {
      key: "grace_period",
      name: "Grace Period",
      description: "Adds +15 seconds to the timer.",
      icon: "⏳",
      costs: { one: 8, three: 20 },
    },
    {
      key: "holy_shield",
      name: "Holy Shield",
      description: "Protects from life loss for 5 mins (Main Game only).",
      icon: "🛡️",
      costs: { one: 10, three: 26 },
    },
    {
      key: "heavenly_match",
      name: "Heavenly Match",
      description: "Automatically solves the current question.",
      icon: "👑",
      costs: { one: 15, three: 40 },
    },
  ];

  const handlePurchase = async (powerup, bundle) => {
    playSound("click", effectsOn);

    const cost = powerup.costs[bundle];
    const quantity = bundle === "one" ? 1 : 3;

    if (gameUser.talents < cost) {
      alert("Not enough talents to purchase this power-up.");
      return;
    }

    setLoading(true);
    try {
      const newBalance = await adjustTalents(gameUser.user_id, -cost);
      if (newBalance === null) throw new Error("Failed to adjust talents.");
      await adjustPowerupInventory(gameUser.user_id, powerup.key, quantity);

      alert(`You bought ${quantity}x ${powerup.name}!`);
      gameUser.talents = newBalance;

      if (onPurchase) onPurchase();
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    if (tab !== activeTab) {
      playSound("switch", effectsOn);
      setActiveTab(tab);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center mb-4 gap-2">
        {["powerups", "talents", "bonuses"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`px-4 py-2 rounded-lg ${
              activeTab === tab
                ? tab === "powerups"
                  ? "bg-blue-600 text-white"
                  : tab === "talents"
                  ? "bg-yellow-600 text-white"
                  : "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "powerups" && (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-100">
          <h2 className="text-2xl font-extrabold mb-3 text-blue-700 text-center">
            Power-Up Store
          </h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            Exchange your talents for divine advantages (bonuses).
          </p>
          <div className="text-right text-sm mb-4">
            <span className="font-semibold text-gray-700">Your Talents:</span>{" "}
            <span className="text-blue-600 font-bold">
              💎 {gameUser?.talents ?? 0}
            </span>
          </div>

          <div className="space-y-4">
            {powerUps.map((pu) => (
              <div
                key={pu.key}
                className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                    <span className="text-xl">{pu.icon}</span> {pu.name}
                  </div>
                  <p className="text-sm text-gray-600">{pu.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={loading || gameUser.talents < pu.costs.one}
                    onClick={() => handlePurchase(pu, "one")}
                    className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-300 rounded"
                  >
                    1x for 💎 {pu.costs.one}
                  </button>
                  <button
                    disabled={loading || gameUser.talents < pu.costs.three}
                    onClick={() => handlePurchase(pu, "three")}
                    className="px-2 py-1 text-sm bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-300 rounded"
                  >
                    3x for 💎 {pu.costs.three}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "talents" && (
        <TalentStore
          gameUser={gameUser}
          onPurchase={onPurchase}
          effectsOn={effectsOn}
        />
      )}

      {activeTab === "bonuses" && gameUser?.user_id && (
        <BonusesTab userId={gameUser.user_id} />
      )}
    </div>
  );
}
