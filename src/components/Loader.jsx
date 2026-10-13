export default function Loader({
  width = '130px',
  height = '4px',
  color,
  className = '',
  label
}) {
  const style = {
    '--loader-width': width,
    '--height-of-loader': height,
    ...(color ? { '--loader-color': color } : {})
  }

  return (
    <div className={`app-loader-container ${className}`} style={style} role="progressbar" aria-label="Memuat">
      <div className="app-loader-bar" />
      {label && <span className="app-loader-label">{label}</span>}
    </div>
  )
}
