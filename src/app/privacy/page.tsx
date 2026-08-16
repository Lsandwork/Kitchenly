export default function PrivacyPage() {
  return (
    <main className="kf-page max-w-2xl space-y-6 py-12">
      <p className="kf-eyebrow">Privacy</p>
      <h1 className="display text-4xl">Your kitchen stays yours</h1>
      <p className="text-lg text-[var(--kf-text-muted)]">
        Kitchen photos can reveal a lot — addresses on takeout, kids&apos; drawings on the fridge, medication on a shelf.
        This app is built to keep that boring and contained.
      </p>
      <ul className="list-disc space-y-3 pl-5 text-[var(--kf-text-muted)]">
        <li>Photos are stored so we can identify ingredients, then expire automatically (default 7 days).</li>
        <li>Inventory, conversations, and preferences stay on your account so dinner gets smarter. They are not sold.</li>
        <li>API keys for AI and grocery providers never ship to the browser.</li>
        <li>We never invent store inventory, prices, or recipe sources.</li>
        <li>You can delete scans, your kitchen, conversations, and the whole account from Settings.</li>
      </ul>
    </main>
  );
}
