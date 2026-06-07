export default function ShiLogo({ className = 'h-10 w-auto' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 64"
      role="img"
      aria-label="SHI"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shi-ring-gradient" x1="7" y1="5" x2="57" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F72A8A" />
          <stop offset="0.52" stopColor="#FF6D15" />
          <stop offset="1" stopColor="#B9D900" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="21" fill="none" stroke="url(#shi-ring-gradient)" strokeWidth="14" />
      <text
        x="76"
        y="48"
        fill="#253746"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontSize="48"
        fontWeight="900"
        letterSpacing="0"
      >
        SHI
      </text>
    </svg>
  )
}
