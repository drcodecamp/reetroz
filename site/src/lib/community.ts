/**
 * Paste invite URLs here when you have them.
 * Env vars win if both are set:
 *   NEXT_PUBLIC_TELEGRAM_URL
 *   NEXT_PUBLIC_DISCORD_URL
 */
const TELEGRAM_URL = "https://t.me/reetroz_official";
const DISCORD_URL = "https://discord.gg/g4SCXh5J8F";

export type CommunityChannel = {
  id: "telegram" | "discord";
  name: string;
  hint: string;
  href: string;
};

export function communityChannels(): CommunityChannel[] {
  return [
    {
      id: "telegram",
      name: "Telegram",
      hint: "Drops, finds, and quick chat.",
      href: process.env.NEXT_PUBLIC_TELEGRAM_URL || TELEGRAM_URL,
    },
    {
      id: "discord",
      name: "Discord",
      hint: "Threads, scans, and longer nights.",
      href: process.env.NEXT_PUBLIC_DISCORD_URL || DISCORD_URL,
    },
  ];
}
