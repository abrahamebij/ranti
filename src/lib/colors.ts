/** Central JS-side color map – mirrors global.css @theme tokens.
 *  Only used where a raw string is required (e.g. Ionicons color prop).
 *  All className usage must still use the semantic Tailwind utilities.
 */
export const colors = {
  background: '#F8F8F8',
  surface: '#FFFFFF',
  surfaceMuted: '#eff3ed',
  primary: '#166e3d',
  primaryForeground: '#FFFFFF',
  foreground: '#1A1A1A',
  foregroundSecondary: '#555A50',
  muted: '#8A8F84',
  border: '#D3D6CD',
  input: '#F0F1EA',
  tagBg: '#DDE0D6',
  tagText: '#374038',
  activeDot: '#4A8C6B',
} as const;
