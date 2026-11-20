import { Platform, type TextStyle } from 'react-native';

export const lightShop = {
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
  action: '#126B60',
  inverseSurface: '#172B2A',
  inverseAccent: '#DCECC4',
  successSoft: '#EAF8F0',
  warningSoft: '#FFF2E8',
  dangerSoft: '#FBEDEC',
  infoSoft: '#EAF5FF',
  violet: '#7C3AED',
  violetSoft: '#F2EEFF',
  dock: '#FDFFFE',
  dockBorder: '#ECF1ED',
  dockShadow: '0 5px 18px rgba(23, 43, 42, 0.10), 0 1px 3px rgba(23, 43, 42, 0.06)',
};

export type ShopPalette = typeof lightShop;

export const darkShop: ShopPalette = {
  background: '#101917',
  surface: '#192522',
  ink: '#F0F6F2',
  muted: '#A9BDB4',
  primary: '#7DDCC5',
  secondary: '#243A34',
  soft: '#213B34',
  border: '#344842',
  accent: '#374B2F',
  danger: '#FFACA6',
  success: '#9EE0B8',
  warning: '#F4C57E',
  info: '#9BCFF4',
  surfaceMuted: '#202F2B',
  action: '#176C60',
  inverseSurface: '#142E29',
  inverseAccent: '#C9EAB3',
  successSoft: '#213C30',
  warningSoft: '#3B3022',
  dangerSoft: '#482A2B',
  infoSoft: '#233746',
  violet: '#D3B8FF',
  violetSoft: '#362C48',
  dock: '#1B2A26',
  dockBorder: '#3A5047',
  dockShadow: '0 5px 18px rgba(0, 0, 0, 0.28), 0 1px 3px rgba(0, 0, 0, 0.18)',
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
