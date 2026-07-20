import { firstLetter } from '../lib/format'
import styles from './ComposerAvatar.module.css'

interface ComposerAvatarProps {
  name: string
  sortName: string
  imageUrl: string | null
  size?: 'small' | 'large'
}

export function ComposerAvatar({ name, sortName, imageUrl, size = 'small' }: ComposerAvatarProps) {
  const className = `${styles.avatar} ${size === 'large' ? styles.large : styles.small}`
  if (imageUrl) {
    return <img className={className} src={imageUrl} alt={name} />
  }
  return (
    <div className={className}>
      <span className={styles.letter}>{firstLetter(sortName)}</span>
    </div>
  )
}
