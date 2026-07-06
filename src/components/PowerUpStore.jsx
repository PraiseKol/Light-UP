import { useState } from "react";
import { adjustTalents, adjustPowerupInventory } from "@/utils/talentUtils";
import TalentStore from "@/components/TalentStore";
import BonusesTab from "@/components/BonusesTab";
import { playSound } from "@/utils/sound";

export default function PowerUpStore({
  gameUser,
  user,
  onPurchase,
  effectsOn,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("powerups");

  // 🧠 guard: if gameUser not yet loaded
  if (!gameUser) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading Power-Up Store...
      </div>
    );
  }

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
      description: "Adds +15 seconds to the timer (Main Game only).",
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

    // ✅ safely access talents
    const currentTalents = gameUser?.talents ?? 0;

    if (currentTalents < cost) {
      alert("Not enough talents to purchase this power-up.");
      return;
    }

    setLoading(true);
    try {
      const newBalance = await adjustTalents(gameUser.user_id, -cost);
      if (newBalance === null) throw new Error("Failed to adjust talents.");
      await adjustPowerupInventory(gameUser.user_id, powerup.key, quantity);

      alert(`You bought ${quantity}x ${powerup.name}!`);

      // update local balance safely
      gameUser.talents = newBalance;

      onPurchase?.();
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

  const iconTone = { divine_hint: "yellow", grace_period: "", holy_shield: "amber", heavenly_match: "pink" };

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center mb-3 gap-2">
        {["powerups", "talents", "bonuses"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`tab-3d ${activeTab === tab ? "active" : ""}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "powerups" && (
        <div className="modal-3d p-4 sm:p-6 max-w-sm sm:max-w-2xl mx-auto relative overflow-hidden">
          <h2 className="text-lg sm:text-2xl font-extrabold mb-1 sm:mb-2 bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent text-center">
            🎁 Power-Up Store
          </h2>
          <p className="text-center text-[10px] sm:text-sm text-purple-700/70 mb-3 sm:mb-4">
            Exchange your talents for divine advantages.
          </p>

          <div className="flex justify-end mb-3">
            <span className="chip-3d chip-3d-star text-xs">💎 {gameUser?.talents ?? 0} Talents</span>
          </div>

          <div className="space-y-2 md:space-y-3">
            {powerUps.map((pu) => (
              <div key={pu.key} className="row-3d">
                <span className={`icon-orb ${iconTone[pu.key] || ""}`}>{pu.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] md:text-base font-extrabold text-purple-900 truncate">
                    {pu.name}
                  </div>
                  <p className="text-[10px] md:text-xs text-purple-700/70 leading-tight">
                    {pu.description}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 md:gap-2 flex-shrink-0">
                  <button
                    disabled={loading || (gameUser?.talents ?? 0) < pu.costs.one}
                    onClick={() => handlePurchase(pu, "one")}
                    className="btn-orb btn-orb-blue px-2 md:px-3 py-1 text-[10px] md:text-xs whitespace-nowrap"
                  >
                    1× 💎{pu.costs.one}
                  </button>
                  <button
                    disabled={loading || (gameUser?.talents ?? 0) < pu.costs.three}
                    onClick={() => handlePurchase(pu, "three")}
                    className="btn-orb btn-orb-green px-2 md:px-3 py-1 text-[10px] md:text-xs whitespace-nowrap"
                  >
                    3× 💎{pu.costs.three}
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
