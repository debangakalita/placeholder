import CameraScreen from './screens/CameraScreen.jsx'
import { useLocation } from './hooks/useLocation.js'

export default function App() {
  // GPS starts the moment the app opens (rule from CLAUDE.md),
  // so a fix is usually ready by the time a photo is taken.
  const location = useLocation()

  return <CameraScreen location={location} />
}
