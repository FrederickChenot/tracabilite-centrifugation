export function getTempLabel(temp: string): string {
  switch (temp) {
    case 'ambiant': return 'Ambiant (15-25°C)';
    case 'plus4':   return '+5°C (2-8°C)';
    case 'congele': return 'Congelé (≤-15°C)';
    default:        return temp;
  }
}

export function getTempLabelShort(temp: string): string {
  switch (temp) {
    case 'ambiant': return 'Ambiant';
    case 'plus4':   return '+5°C';
    case 'congele': return 'Congelé';
    default:        return temp;
  }
}
