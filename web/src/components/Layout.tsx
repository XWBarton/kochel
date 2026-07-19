import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MiniPlayer } from './MiniPlayer'
import styles from './Layout.module.css'

export function Layout() {
  return (
    <div className={styles.page}>
      <Header />
      <Outlet />
      <MiniPlayer />
    </div>
  )
}
