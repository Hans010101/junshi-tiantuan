interface AdvisorAvatarProps {
  name: string
  personaId?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  decorative?: boolean
  showMissingBadge?: boolean
}

const deepPersonaAvatar: Record<string, string> = {
  sunzi: '/advisors/portraits/sunzi.png',
  munger: '/advisors/portraits/munger.png',
  jobs: '/advisors/portraits/jobs.png',
  bezos: '/advisors/portraits/bezos.png',
  zeng: '/advisors/portraits/zengguofan.png',
  wang: '/advisors/portraits/wangyangming.png',
  socrates: '/advisors/portraits/socrates.png',
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
  const usesPortraitCrop = image?.startsWith('/advisors/portraits/') ?? false
  const accessibleProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': image ? `${name}专业设计肖像` : `${name}头像素材待补` }

  return (
    <span className={`advisor-avatar avatar-${size} ${image ? 'has-art' : 'is-placeholder'} ${usesPortraitCrop ? 'portrait-crop' : ''}`} {...accessibleProps}>
      {image ? <img src={image} alt="" loading="lazy" /> : <span className="avatar-placeholder-char">{name.slice(0, 1)}</span>}
      {showMissingBadge && !image && <i>待补</i>}
    </span>
  )
}
