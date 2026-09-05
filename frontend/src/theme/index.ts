/**
 * Design system VORA.
 *
 * Source unique des couleurs, espacements, rayons et typographies.
 * Aucun composant ne doit contenir de valeur brute (#RRGGBB, 16, 24...) :
 * tout passe par ce fichier, pour que le design reste coherent et
 * modifiable en un seul endroit.
 */

export const colors = {
  // Accent de marque. RESERVE aux actions primaires et a la position
  // utilisateur. Ne pas l'utiliser pour des icones decoratives.
  primary: '#FF4713',
  primaryPressed: '#E03A0C',
  primarySoft: '#FFEDE8',

  // Position utilisateur sur la carte (halo + point).
  userDot: '#3B5BFF',
  userHalo: 'rgba(59, 91, 255, 0.22)',

  // Statut : chauffeurs disponibles.
  online: '#12B76A',

  // Neutres.
  text: '#101828',
  textMuted: '#667085',
  textFaint: '#98A2B3',

  surface: '#FFFFFF',
  surfaceAlt: '#F2F4F7',
  border: '#EAECF0',

  // Fond de secours affiche derriere la carte pendant son chargement.
  mapFallback: '#E8EAE6',

  overlay: 'rgba(16, 24, 40, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  pill: 999,
} as const;

/**
 * Hauteur commune des bottom sheets, hors marge de securite basse.
 *
 * Elle vaut celle du sheet d'accueil (titre + champ de recherche + rangee de
 * raccourcis) : c'est le premier panneau que voit l'utilisateur, et
 * tous les suivants s'alignent dessus pour que la carte garde exactement la
 * meme surface visible d'un ecran a l'autre. Sans cela, chaque panneau
 * redimensionnerait la carte en apparaissant, et le trace sauterait.
 */
export const SHEET_HEIGHT = 310;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  label: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textFaint },
} as const;

/**
 * Ombres. iOS et Android n'utilisent pas les memes proprietes : on expose
 * des presets deja combines pour ne pas les melanger a la main.
 */
export const shadows = {
  // Elements flottants sur la carte (boutons ronds, badge quartier).
  floating: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  // Marqueurs vehicules : plus discret, ils sont nombreux a l'ecran.
  marker: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  // Bottom sheet : ombre projetee vers le HAUT.
  sheet: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export const theme = { colors, spacing, radius, typography, shadows } as const;
