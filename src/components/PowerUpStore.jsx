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

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center mb-2 md:mb-3 gap-2">
        {["powerups", "talents", "bonuses"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`px-1.5 md:px-4 py-1 md:py-2 text-[10px] md:text-xs rounded-full font-bold transition-all ${
              activeTab === tab
                ? tab === "powerups"
                  ? "bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_3px_0_#1e40af] scale-105"
                  : tab === "talents"
                  ? "bg-gradient-to-b from-yellow-400 to-yellow-600 text-white shadow-[0_3px_0_#ca8a04] scale-105"
                  : "bg-gradient-to-b from-green-400 to-green-600 text-white shadow-[0_3px_0_#16a34a] scale-105"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "powerups" && (
        <div className="p-4 sm:p-6 max-w-sm sm:max-w-2xl mx-auto bg-gradient-to-br from-christmasGreen/10 via-white to-christmasRed/10 rounded-xl sm:rounded-2xl shadow-[0_8px_0_#166534,0_12px_20px_rgba(22,101,52,0.4)] border-2 border-christmasGreen/30 relative overflow-hidden">
          {/* Christmas ribbon decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
            <div className="absolute top-3 -right-6 bg-christmasRed text-white text-xs font-bold py-1 px-8 rotate-45 shadow-md">
              🎁
            </div>
          </div>
          
          <h2 className="text-4xs sm:text-2xl font-extrabold mb-2 sm:mb-3 bg-gradient-to-r from-christmasGreen to-christmasRed bg-clip-text text-transparent text-center">
            🎁 Power-Up Store
          </h2>
          <p className="text-center text-[8px] sm:text-sm text-gray-500 mb-1 sm:mb-6">
            Exchange your talents for divine advantages (bonuses).
          </p>

          <div className="text-right text-[9px] md:text-sm mb-2 md:mb-3 ">
            <span className="font-semibold text-gray-700">Your Talents:</span>{" "}
            <span className="text-blue-600 font-bold">
              💎 {gameUser?.talents ?? 0}
            </span>
          </div>

          <div className="space-y-1 md:space-y-3">
            {powerUps.map((pu, index) => (
              <div
                key={pu.key}
                className="flex justify-between items-center bg-gradient-to-r from-christmasGreen/5 to-christmasRed/5 border border-christmasGreen/30 p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-sm relative overflow-hidden"
              >
                {/* Gift box ribbon effect */}
                <div className="absolute top-0 left-1/2 w-1 h-full bg-christmasRed/20" />
                <div className="absolute top-1/2 left-0 w-full h-1 bg-christmasRed/20" />
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] md:text-lg font-semibold text-blue-900 flex items-center gap-1 md:gap-2">
                    <span className="text-base sm:text-xl">{pu.icon}</span>{" "}
                    {pu.name}
                  </div>
                  <p className="text-[7px] md:text-sm text-gray-600">
                    {pu.description}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 md:gap-2">
                  <button
                    disabled={loading || (gameUser?.talents ?? 0) < pu.costs.one}
                    onClick={() => handlePurchase(pu, "one")}
                    className="px-1 md:px-2 py-0.5 md:py-1 text-[8px] md:text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-300 rounded"
                  >
                    1x for 💎 {pu.costs.one}
                  </button>
                  <button
                    disabled={
                      loading || (gameUser?.talents ?? 0) < pu.costs.three
                    }
                    onClick={() => handlePurchase(pu, "three")}
                    className="px-1 md:px-2 py-0.5 md:py-1 text-[8px] md:text-sm bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-300 rounded"
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
