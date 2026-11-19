// Ikon dari aplikasi Android (res/drawable/ic_ghm_*.xml), digambar ulang sebagai SVG.

const Stroke = ({ size = 24, viewBox = "0 0 24 24", width = 2, children, ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);

export const IconSampah = (p) => (
  <Stroke {...p}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></Stroke>
);
export const IconMaggot = (p) => (
  <Stroke {...p}><path d="M3 13.5a4.5 4.5 0 0 1 4.5-4.5h9a4.5 4.5 0 0 1 0 9h-9A4.5 4.5 0 0 1 3 13.5z" /><path d="M8.5 9.2v8.6" /><path d="M12 9v9" /><path d="M15.5 9.2v8.6" /><path d="M19.5 6.5 21 5" /></Stroke>
);
export const IconChat = (p) => (
  <Stroke {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></Stroke>
);
export const IconBell = (p) => (
  <Stroke width={1.8} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Stroke>
);
export const IconKeluar = (p) => (
  <Stroke width={1.8} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Stroke>
);
export const IconKembali = (p) => (
  <Stroke {...p}><path d="M12 19 5 12l7-7" /><path d="M19 12H5" /></Stroke>
);
export const IconChevron = (p) => (
  <Stroke width={1.8} {...p}><path d="m9 18 6-6-6-6" /></Stroke>
);
export const IconKalender = (p) => (
  <Stroke viewBox="0 0 22 22" width={1.83} {...p}><rect x="2.75" y="3.67" width="16.5" height="16.5" rx="1.83" /><path d="M14.67 1.83V5.5" /><path d="M7.33 1.83V5.5" /><path d="M2.75 9.17h16.5" /></Stroke>
);
export const IconJam = (p) => (
  <Stroke viewBox="0 0 22 22" width={1.83} {...p}><circle cx="11" cy="11" r="9.17" /><path d="M11 5.5V11l3.67 1.83" /></Stroke>
);
export const IconKirim = (p) => (
  <Stroke viewBox="0 0 22 22" width={1.83} {...p}><path d="M20.17 1.83 13.75 20.17l-3.67-8.25-8.25-3.67 18.34-6.42Z" /><path d="M20.17 1.83 10.08 11.92" /></Stroke>
);
export const IconKurang = (p) => (
  <Stroke viewBox="0 0 26 26" width={2.6} {...p}><path d="M5.42 13h15.16" /></Stroke>
);
export const IconTambah = (p) => (
  <Stroke viewBox="0 0 26 26" width={2.6} {...p}><path d="M5.42 13h15.16" /><path d="M13 5.42v15.16" /></Stroke>
);
export const IconCentang = (p) => (
  <Stroke viewBox="0 0 14 14" width={1.75} {...p}><path d="M11.67 3.5 5.25 9.92 2.33 7" /></Stroke>
);
export const IconInfo = (p) => (
  <Stroke viewBox="0 0 22 22" width={1.65} {...p}><circle cx="11" cy="11" r="9.17" /><path d="M11 14.67V11" /><path d="M11 7.33h.01" /></Stroke>
);
export const IconMata = ({ tertutup, ...p }) => (
  <Stroke width={1.8} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {tertutup && <path d="M3 3l18 18" />}
  </Stroke>
);
