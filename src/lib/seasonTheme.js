// Determines the current season based on the month
export function getCurrentSeason() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export const SEASONS = {
  spring: {
    label: 'Frühling',
    emoji: '🌸',
    // CSS variables (HSL values as strings)
    vars: {
      '--background': '145 12% 7%',
      '--foreground': '145 25% 92%',
      '--primary': '150 50% 45%',
      '--primary-foreground': '145 20% 98%',
      '--card': '145 12% 10%',
      '--card-foreground': '145 25% 92%',
      '--secondary': '145 15% 15%',
      '--accent': '155 35% 22%',
      '--accent-foreground': '150 35% 82%',
      '--muted': '145 10% 16%',
      '--muted-foreground': '145 12% 58%',
      '--border': '145 12% 18%',
      '--ring': '150 50% 45%',
    },
    patternColor: 'rgba(120,220,140,0.04)',
    patternType: 'dots',
    glowColor: 'rgba(100,220,130,0.12)',
    description: 'Zarte Knospen. Frisches Grün. Erwachen.',
  },
  summer: {
    label: 'Sommer',
    emoji: '☀️',
    vars: {
      '--background': '140 14% 6%',
      '--foreground': '140 22% 91%',
      '--primary': '145 55% 42%',
      '--primary-foreground': '140 20% 98%',
      '--card': '140 14% 9%',
      '--card-foreground': '140 22% 91%',
      '--secondary': '140 14% 14%',
      '--accent': '150 38% 20%',
      '--accent-foreground': '145 32% 80%',
      '--muted': '140 10% 15%',
      '--muted-foreground': '140 11% 55%',
      '--border': '140 12% 17%',
      '--ring': '145 55% 42%',
    },
    patternColor: 'rgba(80,200,100,0.035)',
    patternType: 'lines',
    glowColor: 'rgba(60,180,90,0.14)',
    description: 'Volles Blätterdach. Tiefes Grün. Stille Wärme.',
  },
  autumn: {
    label: 'Herbst',
    emoji: '🍂',
    vars: {
      '--background': '28 14% 6%',
      '--foreground': '35 25% 90%',
      '--primary': '28 55% 48%',
      '--primary-foreground': '35 20% 98%',
      '--card': '28 14% 9%',
      '--card-foreground': '35 25% 90%',
      '--secondary': '28 16% 14%',
      '--accent': '22 40% 20%',
      '--accent-foreground': '30 38% 78%',
      '--muted': '28 10% 15%',
      '--muted-foreground': '30 12% 55%',
      '--border': '28 14% 17%',
      '--ring': '28 55% 48%',
    },
    patternColor: 'rgba(200,140,60,0.04)',
    patternType: 'leaves',
    glowColor: 'rgba(200,120,40,0.12)',
    description: 'Goldenes Laub. Warme Töne. Das Loslassen.',
  },
  winter: {
    label: 'Winter',
    emoji: '❄️',
    vars: {
      '--background': '210 18% 6%',
      '--foreground': '210 20% 90%',
      '--primary': '200 40% 45%',
      '--primary-foreground': '210 20% 98%',
      '--card': '210 18% 9%',
      '--card-foreground': '210 20% 90%',
      '--secondary': '210 16% 14%',
      '--accent': '205 28% 20%',
      '--accent-foreground': '200 28% 80%',
      '--muted': '210 12% 15%',
      '--muted-foreground': '210 10% 55%',
      '--border': '210 16% 17%',
      '--ring': '200 40% 45%',
    },
    patternColor: 'rgba(160,200,220,0.04)',
    patternType: 'dots',
    glowColor: 'rgba(140,190,220,0.10)',
    description: 'Stille. Eis und Kristall. Der Wald schläft.',
  },
};
