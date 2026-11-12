import { Platform, type TextStyle } from 'react-native';

export const shop = {
  background: '#F7F8F6',
  surface: '#FFFFFF',
  ink: '#172B2A',
  muted: '#627471',
  primary: '#126B60',
  secondary: '#223D39',
  soft: '#EAF2EF',
  border: '#E1E7E3',
  accent: '#DCECC4',
  danger: '#B43D3D',
  success: '#28704E', warning: '#98601A', info: '#386C98',
  surfaceMuted: '#F0F3F0',
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const layout = { gutter: 20, maxWidth: 760, touch: 48 };
export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
export const typography = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: '700', letterSpacing: -1.2 },
  heading: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 17, lineHeight: 25, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export const cardShadow = {
  shadowColor: '#172B2A',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 1,
};
