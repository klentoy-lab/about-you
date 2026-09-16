const MAIN = [
  { path: '', label: 'Today', match: ['today'] },
  { path: 'timeline', label: 'Timeline', match: ['timeline'] },
  { path: 'calendar', label: 'Calendar', match: ['calendar'] },
  { path: 'media', label: 'Media wall', match: ['media'] },
  { path: 'search', label: 'Search', match: ['search'] },
  { path: 'lockbin', label: 'Lockbin', match: ['lockbin'] },
  { path: 'diaries', label: 'Diaries', match: ['diaries', 'publicDiary', 'publicEntry'] },
]

const SIDE = [
  { path: 'settings', label: 'Settings', match: ['settings'] },
  { path: 'tokens', label: 'Tokens', match: ['tokens'] },
]

function Item({ item, route }) {
  const active = item.match.includes(route.name)
  return (
    <a
      href={`#/${item.path}`}
      aria-current={active ? 'page' : undefined}
      className={`type-meta block whitespace-nowrap py-1 ${active ? 'text-mango' : 'text-vanilla hover:text-mango'}`}
    >
      {item.label}
    </a>
  )
}

export default function Nav({ route }) {
  return (
    <nav aria-label="Ember" className="sticky top-0 z-40 bg-ink">
      <div className="flex h-14 items-center gap-8 overflow-x-auto px-5 [scrollbar-width:none] md:px-8">
        <a href="#/" className="type-display shrink-0 text-[22px] text-vanilla hover:text-mango">
          Ember
        </a>

        <ul className="flex shrink-0 items-center gap-6">
          {MAIN.map((item) => (
            <li key={item.label}>
              <Item item={item} route={route} />
            </li>
          ))}
        </ul>

        <ul className="ml-auto flex shrink-0 items-center gap-6">
          {SIDE.map((item) => (
            <li key={item.label}>
              <Item item={item} route={route} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
