import { firstLetter } from '../lib/format'
import styles from './ComposerAvatar.module.css'

interface ComposerAvatarProps {
  name: string
  sortName: string
  imageUrl: string | null
  focalX?: number
  focalY?: number
  size?: 'small' | 'large'
}

export function ComposerAvatar({
  name,
  sortName,
  imageUrl,
  focalX = 0.5,
  focalY = 0.5,
  size = 'small',
}: ComposerAvatarProps) {
  const className = `${styles.avatar} ${size === 'large' ? styles.large : styles.small}`
  if (imageUrl) {
    return (
      <img
        className={className}
        src={imageUrl}
        alt={name}
        style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
      />
    )
  }
  return (
    <div className={className}>
      <span className={styles.letter}>{firstLetter(sortName)}</span>
    </div>
  )
}
