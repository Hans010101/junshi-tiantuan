import type { ReactNode } from 'react'

interface PersonaPortraitProps {
  personaId: string
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  decorative?: boolean
}

const faceDetails: Record<string, ReactNode> = {
  sunzi: <><path d="M38 28l12-8 12 8-3 5H41z"/><path d="M45 21v-5m10 5v-5M43 40c2 3 5 4 7 4s5-1 7-4M45 45c1 9 3 13 5 16 2-3 4-7 5-16"/></>,
  munger: <><path d="M39 30c3-7 18-9 23 0M39 29c2-8 7-12 14-12 5 0 9 3 11 8"/><rect x="40" y="33" width="9" height="7" rx="3"/><rect x="51" y="33" width="9" height="7" rx="3"/><path d="M49 36h2M45 45c3 2 7 2 10 0"/></>,
  drucker: <><path d="M40 28c3-7 17-9 21 0M42 26c4-6 11-7 17-2"/><rect x="40" y="33" width="9" height="7" rx="2"/><rect x="51" y="33" width="9" height="7" rx="2"/><path d="M49 36h2M47 50l3 5 3-5m-3 5v15"/></>,
  jobs: <><path d="M39 29c3-9 18-12 24-2M39 28c4-6 8-10 15-10 5 0 9 2 11 6"/><circle cx="45" cy="36" r="4"/><circle cx="55" cy="36" r="4"/><path d="M49 36h2M45 46c3 2 7 2 10 0M39 70c2-12 6-17 11-17s9 5 11 17"/></>,
  bezos: <><path d="M40 30c1-9 6-14 10-14s9 5 10 14M43 45c4 4 10 4 14 0"/><path d="M37 70c2-12 7-18 13-18s11 6 13 18M45 55l5 8 5-8"/></>,
  zeng: <><path d="M37 28h26M40 27c2-7 18-7 20 0M45 20h10M50 20v-7"/><path d="M43 43c2 3 5 4 7 4s5-1 7-4M44 47c0 7 2 13 6 17 4-4 6-10 6-17"/><path d="M34 72c3-9 9-14 16-14s13 5 16 14"/></>,
  wang: <><path d="M39 29c2-8 20-8 22 0M43 24c2-5 4-7 7-7s5 2 7 7M47 17h6M50 17v-5"/><path d="M43 45c4 3 10 3 14 0M44 48c1 7 3 11 6 14 3-3 5-7 6-14M38 70l5-14 7 7 7-7 5 14"/></>,
  socrates: <><path d="M40 30c1-9 6-14 10-14s9 5 10 14M39 26c3-5 6-8 11-9"/><path d="M42 44c2 2 5 3 8 3s6-1 8-3M41 46c1 11 4 17 9 20 5-3 8-9 9-20M36 71c3-8 8-12 14-12s11 4 14 12"/></>,
  musk: <><path d="M38 29c2-9 9-14 16-13 6 1 10 5 11 11M39 27c7-2 14-5 21-2M43 45c4 3 10 3 14 0"/><path d="M36 71c3-12 8-18 14-18s11 6 14 18M43 56l7 8 7-8"/></>,
}

function DefaultDetail() {
  return <><path d="M39 29c3-8 19-10 23 0M42 26c4-6 12-8 18-2M43 45c4 3 10 3 14 0"/><path d="M36 71c3-12 8-18 14-18s11 6 14 18"/></>
}

export function PersonaPortrait({ personaId, name, size = 'md', decorative = false }: PersonaPortraitProps) {
  return (
    <svg
      className={`persona-portrait portrait-${size}`}
      viewBox="0 0 100 100"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${name}线描头像`}
    >
      <circle cx="50" cy="50" r="47" fill="#f7edcf" stroke="#a98a48" strokeWidth="1.8" />
      <circle cx="50" cy="50" r="42.5" fill="none" stroke="#d7bf82" strokeWidth="1" />
      <g fill="none" stroke="#95743c" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 30v9c0 9 4 15 10 15s10-6 10-15v-9" />
        <path d="M45 35h.2M55 35h.2M49 37l-1 5h4" strokeWidth="2.2" />
        {faceDetails[personaId] ?? <DefaultDetail />}
        <path d="M34 76c3-11 9-17 16-17s13 6 16 17" />
      </g>
      <path d="M23 81c10 7 44 7 54 0" fill="none" stroke="#d7bf82" strokeWidth="1" />
    </svg>
  )
}
