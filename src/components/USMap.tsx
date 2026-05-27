'use client'

// State admission years
const STATE_ADMISSION: Record<string, number> = {
  DE: 1787, PA: 1787, NJ: 1787, GA: 1788, CT: 1788, MA: 1788,
  MD: 1788, SC: 1788, NH: 1788, VA: 1788, NY: 1788, NC: 1789,
  RI: 1790, VT: 1791, KY: 1792, TN: 1796, OH: 1803, LA: 1812,
  IN: 1816, MS: 1817, IL: 1818, AL: 1819, ME: 1820, MO: 1821,
  AR: 1836, MI: 1837, FL: 1845, TX: 1845, IA: 1846, WI: 1848,
  CA: 1850, MN: 1858, OR: 1859, KS: 1861, WV: 1863, NV: 1864,
  NE: 1867, CO: 1876, ND: 1889, SD: 1889, MT: 1889, WA: 1889,
  ID: 1890, WY: 1890, UT: 1896, OK: 1907, NM: 1912, AZ: 1912,
  AK: 1959, HI: 1959,
}

// Simplified SVG paths for each US state in an Albers-like projection
// Coordinates normalized to fit in a 960x600 viewBox
const STATE_PATHS: Record<string, string> = {
  AL: 'M 561 304 L 567 304 L 571 351 L 560 353 L 553 330 L 553 304 Z',
  AK: 'M 100 440 L 100 500 L 220 500 L 260 470 L 240 440 L 200 420 L 150 425 Z',
  AZ: 'M 196 280 L 253 280 L 259 340 L 207 340 L 196 320 Z',
  AR: 'M 520 290 L 568 290 L 568 325 L 520 325 Z',
  CA: 'M 112 200 L 160 185 L 175 240 L 163 305 L 120 330 L 100 290 L 108 240 Z',
  CO: 'M 290 230 L 378 230 L 378 280 L 290 280 Z',
  CT: 'M 782 176 L 805 176 L 805 196 L 778 198 Z',
  DE: 'M 780 216 L 795 213 L 800 235 L 781 235 Z',
  FL: 'M 565 355 L 620 355 L 640 390 L 605 430 L 580 440 L 560 410 L 557 375 Z',
  GA: 'M 568 305 L 612 305 L 615 355 L 567 351 Z',
  HI: 'M 280 510 L 350 510 L 350 545 L 280 545 Z',
  ID: 'M 196 100 L 234 100 L 248 180 L 212 195 L 196 180 Z',
  IL: 'M 534 210 L 562 210 L 562 288 L 534 288 Z',
  IN: 'M 565 210 L 593 210 L 593 275 L 565 275 Z',
  IA: 'M 466 200 L 533 200 L 533 240 L 466 240 Z',
  KS: 'M 380 260 L 468 260 L 468 300 L 380 300 Z',
  KY: 'M 565 268 L 648 265 L 650 298 L 567 300 Z',
  LA: 'M 495 345 L 550 345 L 555 385 L 520 400 L 490 380 Z',
  ME: 'M 830 100 L 860 95 L 865 145 L 835 155 L 820 135 Z',
  MD: 'M 745 230 L 786 228 L 786 248 L 750 250 L 742 244 Z',
  MA: 'M 800 168 L 848 162 L 848 182 L 800 184 Z',
  MI: 'M 568 148 L 610 138 L 620 190 L 595 200 L 568 190 Z',
  MN: 'M 455 105 L 520 105 L 530 195 L 466 195 Z',
  MS: 'M 530 300 L 568 300 L 565 355 L 528 360 Z',
  MO: 'M 468 245 L 534 245 L 534 295 L 468 295 Z',
  MT: 'M 196 90 L 350 90 L 350 155 L 196 155 Z',
  NE: 'M 379 220 L 467 220 L 467 260 L 379 260 Z',
  NV: 'M 155 185 L 210 185 L 218 270 L 175 285 L 151 255 Z',
  NH: 'M 815 128 L 834 126 L 835 168 L 812 172 Z',
  NJ: 'M 783 198 L 800 196 L 800 228 L 781 230 Z',
  NM: 'M 256 280 L 335 280 L 335 355 L 256 355 Z',
  NY: 'M 720 160 L 810 158 L 812 195 L 760 200 L 728 200 Z',
  NC: 'M 640 270 L 752 260 L 755 295 L 643 300 Z',
  ND: 'M 380 100 L 464 100 L 462 150 L 378 150 Z',
  OH: 'M 595 205 L 645 205 L 648 262 L 596 265 Z',
  OK: 'M 375 300 L 519 300 L 519 340 L 370 340 Z',
  OR: 'M 115 130 L 210 125 L 215 185 L 155 185 L 110 175 Z',
  PA: 'M 700 197 L 781 193 L 781 230 L 700 230 Z',
  RI: 'M 808 184 L 820 182 L 820 198 L 806 200 Z',
  SC: 'M 615 295 L 664 290 L 666 335 L 620 345 Z',
  SD: 'M 380 150 L 465 150 L 463 200 L 381 200 Z',
  TN: 'M 540 295 L 648 290 L 650 320 L 540 325 Z',
  TX: 'M 340 300 L 490 295 L 510 340 L 505 395 L 455 430 L 385 450 L 335 410 L 325 360 Z',
  UT: 'M 215 220 L 292 220 L 292 290 L 215 290 Z',
  VT: 'M 795 128 L 815 126 L 815 170 L 793 172 Z',
  VA: 'M 668 245 L 760 237 L 762 272 L 668 275 Z',
  WA: 'M 115 80 L 215 75 L 218 125 L 115 128 Z',
  WV: 'M 660 228 L 705 225 L 710 262 L 666 265 Z',
  WI: 'M 508 140 L 560 138 L 562 208 L 508 208 Z',
  WY: 'M 290 155 L 378 155 L 378 225 L 290 225 Z',
}

// Label positions for state abbreviations
const STATE_LABELS: Record<string, [number, number]> = {
  AL: [562, 328], AK: [160, 468], AZ: [225, 312], AR: [543, 308],
  CA: [137, 258], CO: [334, 255], CT: [790, 186], DE: [789, 224],
  FL: [590, 395], GA: [590, 330], HI: [315, 528], ID: [214, 148],
  IL: [548, 249], IN: [578, 243], IA: [499, 220], KS: [424, 280],
  KY: [607, 282], LA: [520, 372], ME: [840, 122], MD: [763, 239],
  MA: [824, 173], MI: [590, 168], MN: [492, 150], MS: [548, 328],
  MO: [501, 270], MT: [273, 122], NE: [423, 240], NV: [183, 235],
  NH: [823, 148], NJ: [790, 213], NM: [295, 317], NY: [765, 180],
  NC: [697, 280], ND: [421, 125], OH: [620, 234], OK: [447, 320],
  OR: [162, 155], PA: [740, 211], RI: [814, 191], SC: [638, 318],
  SD: [422, 175], TN: [594, 308], TX: [418, 372], UT: [254, 255],
  VT: [804, 148], VA: [714, 258], WA: [165, 102], WV: [683, 244],
  WI: [534, 173], WY: [334, 190],
}

export default function USMap({ year }: { year: number }) {
  const states = Object.keys(STATE_PATHS)

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <svg
        viewBox="0 0 960 600"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Ocean background */}
        <rect width="960" height="600" fill="#0a0a1a" rx="12" />

        {states.map(code => {
          const admissionYear = STATE_ADMISSION[code]
          const admitted = admissionYear <= year

          return (
            <g key={code}>
              <path
                d={STATE_PATHS[code]}
                fill={admitted ? '#d4aa50' : '#1e2235'}
                stroke={admitted ? '#0a0a1a' : '#2a2f4a'}
                strokeWidth="1.5"
                opacity={admitted ? 1 : 0.7}
                style={{ transition: 'fill 0.3s ease, opacity 0.3s ease' }}
              />
              {STATE_LABELS[code] && (
                <text
                  x={STATE_LABELS[code][0]}
                  y={STATE_LABELS[code][1]}
                  textAnchor="middle"
                  fontSize="7"
                  fill={admitted ? '#0a0a1a' : '#3a4060'}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  style={{ transition: 'fill 0.3s ease', pointerEvents: 'none' }}
                >
                  {code}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="text-center mt-1 text-xs text-gray-500">
        {year < 1787 ? (
          <span>No states yet — colonies only</span>
        ) : (
          <span style={{ color: '#d4aa50' }}>
            {Object.values(STATE_ADMISSION).filter(y => y <= year).length} state{Object.values(STATE_ADMISSION).filter(y => y <= year).length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
