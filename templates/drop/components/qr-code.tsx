import { encode } from 'uqr'

/**
 * A QR code holding `value`, as inline SVG. Dark modules on paper, whatever
 * the page around it looks like, because that is what a phone camera reads
 * first time. No canvas, no script: it renders on the server like any SVG.
 */
export function QrCode({
  value,
  label,
  size = 176,
  className = '',
}: {
  value: string
  /** What it is, for assistive technology: "The pickup page, as a QR code". */
  label: string
  size?: number
  className?: string
}) {
  const qr = encode(value, { ecc: 'M', border: 2 })
  const modules = qr.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')

  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={qr.size} height={qr.size} fill="#f3efe4" />
      <path d={modules} fill="#0a0a0a" />
    </svg>
  )
}
