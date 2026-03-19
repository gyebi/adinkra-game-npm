const rewardLabelByRank = {
  1: "100 Cedis",
  2: "50 Cedis",
  3: "20 Cedis"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getRewardLabel(rank) {
  return rewardLabelByRank[rank] ?? "Competition Reward";
}

export function buildWinnerEmail({
  playerName,
  rank,
  weekEndingDate,
  claimUrl,
  attempts,
  completionTimeSeconds
}) {
  const safeName = escapeHtml(playerName || "Player");
  const rewardLabel = getRewardLabel(rank);
  const safeClaimUrl = escapeHtml(claimUrl);
  const safeWeekEndingDate = escapeHtml(weekEndingDate);

  return {
    subject: `Adinkra Weekly Competition Winner: ${rewardLabel}`,
    text: [
      `Hello ${playerName || "Player"},`,
      "",
      `You finished #${rank} on the Adinkra weekly competition leaderboard for the week ending ${weekEndingDate}.`,
      `Reward: ${rewardLabel}`,
      `Winning score: ${completionTimeSeconds}s and ${attempts} attempts.`,
      "",
      "To begin reward redemption, open the link below and submit your phone number:",
      claimUrl,
      "",
      "If you did not expect this email, you can ignore it."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; background: #f6efe0; padding: 24px; color: #143244;">
        <div style="max-width: 640px; margin: 0 auto; background: #fffaf0; border-radius: 24px; overflow: hidden; border: 1px solid rgba(143, 95, 32, 0.18);">
          <div style="padding: 28px 28px 18px; background: linear-gradient(145deg, #8e4f20, #145c63); color: #fff7ea;">
            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;">Adinkra Weekly Competition</p>
            <h1 style="margin: 0; font-size: 28px;">You placed #${rank}</h1>
          </div>

          <div style="padding: 24px 28px 28px;">
            <p style="margin-top: 0; font-size: 16px; line-height: 1.55;">
              Hello <strong>${safeName}</strong>, your verified competition entry finished in the top 3 for the week ending <strong>${safeWeekEndingDate}</strong>.
            </p>

            <div style="display: grid; gap: 12px; margin: 22px 0;">
              <div style="padding: 14px 16px; border-radius: 16px; background: rgba(20, 92, 99, 0.08);">
                <strong style="display: block; margin-bottom: 4px;">Reward</strong>
                <span>${rewardLabel}</span>
              </div>
              <div style="padding: 14px 16px; border-radius: 16px; background: rgba(199, 141, 44, 0.12);">
                <strong style="display: block; margin-bottom: 4px;">Winning Score</strong>
                <span>${completionTimeSeconds}s and ${attempts} attempts</span>
              </div>
            </div>

            <p style="font-size: 15px; line-height: 1.55;">
              To begin reward redemption, submit the phone number you want us to use for fulfillment.
            </p>

            <p style="margin: 24px 0;">
              <a
                href="${safeClaimUrl}"
                style="display: inline-block; padding: 14px 18px; border-radius: 999px; background: #145c63; color: #fff7ea; text-decoration: none; font-weight: 700;"
              >
                Submit phone number
              </a>
            </p>

            <p style="font-size: 13px; line-height: 1.5; color: rgba(20, 50, 68, 0.8); margin-bottom: 0;">
              If you did not expect this email, you can ignore it.
            </p>
          </div>
        </div>
      </div>
    `
  };
}
