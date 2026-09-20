import { communityChannels, type CommunityChannel } from "@/lib/community";

type Variant = "full" | "strip";

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M21.2 3.4 2.7 10.7c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 11-7c.5-.3.9-.1.6.2l-8.9 8.1-.3 4.6c.5 0 .7-.2 1-.6l2.4-2.3 5 3.7c.9.5 1.6.2 1.8-.9l3.3-15.5c.3-1.4-.5-2-1.6-1.7z" />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M19.3 4.7A17.4 17.4 0 0 0 14.9 3l-.4.8a15.6 15.6 0 0 1 4 1.6 16 16 0 0 0-12.9 0A15.6 15.6 0 0 1 9.5 3.8L9.1 3A17.4 17.4 0 0 0 4.7 4.7C1.8 9 .9 13.2 1.2 17.3A17.6 17.6 0 0 0 6.6 20l1.1-1.8a11.3 11.3 0 0 1-1.8-.9l.4-.3a12.7 12.7 0 0 0 11.4 0l.4.3a11.3 11.3 0 0 1-1.8.9L17.4 20a17.6 17.6 0 0 0 5.4-2.7c.4-4.8-.7-8.9-3.5-12.6ZM8.8 14.7c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.9.9 1.8 2.1-.8 2.1-1.8 2.1Zm6.4 0c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.9.9 1.8 2.1-.8 2.1-1.8 2.1Z" />
    </svg>
  );
}

const brand: Record<
  CommunityChannel["id"],
  { mark: typeof TelegramMark; chip: string; glow: string; ring: string }
> = {
  telegram: {
    mark: TelegramMark,
    chip: "bg-[#229ED9]/15 text-[#7ad4ff]",
    glow: "group-hover:shadow-[0_0_32px_rgba(34,158,217,0.18)]",
    ring: "hover:border-[#229ED9]/45",
  },
  discord: {
    mark: DiscordMark,
    chip: "bg-[#5865F2]/15 text-[#9aa3ff]",
    glow: "group-hover:shadow-[0_0_32px_rgba(88,101,242,0.2)]",
    ring: "hover:border-[#5865F2]/45",
  },
};

function ChannelCard({ channel, compact }: { channel: CommunityChannel; compact?: boolean }) {
  const look = brand[channel.id];
  const Mark = look.mark;
  const ready = Boolean(channel.href);
  const className = `group flex items-center gap-3 rounded-2xl border border-paper/12 bg-ink/50 ${
    compact ? "px-3.5 py-3" : "px-4 py-4"
  } transition ${look.glow} ${ready ? look.ring : ""}`;

  const inner = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${look.chip}`}>
        <Mark />
      </span>
      <span className="min-w-0 text-left">
        <span className="block font-display text-base font-semibold tracking-tight">
          Join {channel.name}
        </span>
        <span className="mt-0.5 block text-sm text-paper-dim">{channel.hint}</span>
      </span>
      <span className="ml-auto text-paper-dim transition group-hover:translate-x-0.5 group-hover:text-paper" aria-hidden>
        →
      </span>
    </>
  );

  if (!ready) {
    return (
      <div className={className} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
  );
}

export function JoinCommunity({ variant = "full" }: { variant?: Variant }) {
  const channels = communityChannels();

  if (variant === "strip") {
    return (
      <aside
        id="community"
        className="overflow-hidden rounded-2xl border border-paper/10 bg-ink-2/50"
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-amber">
              The lobby
            </p>
            <p className="mt-1 font-display text-xl font-semibold tracking-tight">
              Come talk magazines.
            </p>
            <p className="mt-1 text-sm text-paper-dim">
              Find a missing issue, share a scan, or hang after the last page.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[20rem] sm:grid-cols-2">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} compact />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <section id="community" className="relative overflow-hidden py-20 lg:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_20%_0%,rgba(34,158,217,0.1),transparent_50%),radial-gradient(60%_70%_at_90%_20%,rgba(88,101,242,0.12),transparent_45%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-teal">The lobby</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
            Don&apos;t read the last
            <br />
            page alone.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-paper-dim">
            Telegram for quick finds. Discord for longer nights. Same people, two doors —
            drop a scan, hunt a missing issue, or just talk about the pile on the nightstand.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      </div>
    </section>
  );
}
