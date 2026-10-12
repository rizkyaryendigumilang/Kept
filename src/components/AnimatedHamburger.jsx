import Hamburger, {
  Cross,
  Fade,
  Pivot,
  Rotate,
  Slant,
  Sling,
  Spin,
  Spiral,
  Squash,
  Squeeze,
  Turn,
  Twirl
} from 'hamburger-react'

export const HAMBURGER_STYLES = [
  { id: 'squash', label: 'Squash', Component: Squash },
  { id: 'tilt', label: 'Tilt', Component: Hamburger },
  { id: 'spin', label: 'Spin', Component: Spin },
  { id: 'turn', label: 'Turn', Component: Turn },
  { id: 'squeeze', label: 'Squeeze', Component: Squeeze },
  { id: 'twirl', label: 'Twirl', Component: Twirl },
  { id: 'fade', label: 'Fade', Component: Fade },
  { id: 'pivot', label: 'Pivot', Component: Pivot },
  { id: 'sling', label: 'Sling', Component: Sling },
  { id: 'cross', label: 'Cross', Component: Cross }
]

const STYLE_MAP = {
  squash: Squash,
  tilt: Hamburger,
  spin: Spin,
  turn: Turn,
  squeeze: Squeeze,
  twirl: Twirl,
  fade: Fade,
  pivot: Pivot,
  sling: Sling,
  cross: Cross,
  rotate: Rotate,
  slant: Slant,
  spiral: Spiral
}

export default function AnimatedHamburger({
  style = 'squash',
  toggled = false,
  toggle,
  size = 18,
  duration = 0.35,
  color = 'currentColor',
  rounded = true,
  className = ''
}) {
  const BurgerComponent = STYLE_MAP[style] || Squash

  return (
    <div className={`hamburger-react-wrap ${className}`} aria-hidden="true">
      <BurgerComponent
        toggled={toggled}
        toggle={toggle}
        size={size}
        duration={duration}
        color={color}
        rounded={rounded}
        hideOutline
      />
    </div>
  )
}
