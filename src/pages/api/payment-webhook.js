// pages/api/payment-webhook.js
import { adjustTalents } from "utils/talentUtils";

export default async function handler(req, res) {
  // TODO: verify event signature for security

  const event = req.body;

  if (event.type === "payment_success") {
    const { userId, talents } = event.data.metadata;
    await adjustTalents(userId, talents);
  }

  res.status(200).end();
}
