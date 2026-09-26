import { useLocation } from '@remix-run/react';

const items = [
  { href: '/', label: 'Home', icon: 'i-ph:house' },
  { href: '/storage', label: 'Storage', icon: 'i-ph:hard-drives' },
  { href: '/settings/ai', label: 'AI', icon: 'i-ph:sparkle' },
  { href: 'https://github.com/massipoytro-sketch/Free-Fire-Oktodr', label: 'Code', icon: 'i-ph:github-logo', external: true },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="devos-mobile-nav fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2/95 p-1.5 shadow-[0_-8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {items.map((item) => {
          const active = !item.external && (item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href));

          return (
            <a
              key={item.href}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
              className={[
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition',
                active
                  ? 'bg-accent-500/20 text-accent-400 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.18)]'
                  : 'text-bolt-elements-textTertiary hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`${item.icon} text-xl`} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
