// src/admin/AdminManager.jsx
import { useState } from "react";
import { Button } from "components/ui/button";
import DonationsManager from "./DonationsManager";
import TransactionsManager from "./TransactionsManager";

export default function AdminManager() {
  const [mainTab, setMainTab] = useState("transactions");

  return (
    <div className="p-4">
      {/* Main Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={mainTab === "transactions" ? "default" : "outline"}
          onClick={() => setMainTab("transactions")}
        >
          💳 Transactions
        </Button>
        <Button
          variant={mainTab === "donations" ? "default" : "outline"}
          onClick={() => setMainTab("donations")}
        >
          💝 Donations
        </Button>
      </div>

      {/* Render Selected Tab */}
      {mainTab === "transactions" && <TransactionsManager />}
      {mainTab === "donations" && <DonationsManager />}
      
    </div>
  );
}
