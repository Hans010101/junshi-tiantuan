interface AdvisorAvatarProps {
  name: string
  personaId?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  decorative?: boolean
  showMissingBadge?: boolean
}

const deepPersonaAvatar: Record<string, string> = {
  sunzi: '/advisors/avatars/sunzi.png',
  zeng: '/advisors/avatars/zengguofan.png',
  wang: '/advisors/avatars/wangyangming.png',
  socrates: '/advisors/avatars/socrates.png',
}

export function AdvisorAvatar({
  name,
  personaId,
  src,
  size = 'md',
  decorative = false,
  showMissingBadge = false,
}: AdvisorAvatarProps) {
  const image = src ?? (personaId ? deepPersonaAvatar[personaId] : undefined)
  const accessibleProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': image ? `${name}专业设计头像` : `${name}头像素材待补` }

  return (
    <span className={`advisor-avatar avatar-${size} ${image ? 'has-art' : 'is-placeholder'}`} {...accessibleProps}>
      {image ? <img src={image} alt="" loading="lazy" /> : <span className="avatar-placeholder-char">{name.slice(0, 1)}</span>}
      {showMissingBadge && !image && <i>待补</i>}
    </span>
  )
}
