import type { VehicleKind } from './components/VehicleMarker';
import type { Shortcut } from './components/DestinationSheet';

/**
 * Donnees de demonstration de l'ecran d'accueil.
 *
 * ⚠️ TEMPORAIRE — a remplacer par les vehicules reels renvoyes par le backend
 * (`GET /drivers/nearby`). Isole ici pour que la substitution ne touche qu'un
 * fichier, et pour ne jamais presenter du simule comme du reel (brief §23).
 */

export type NearbyVehicle = {
  id: string;
  kind: VehicleKind;
  /** Decalage en degres par rapport a la position de l'utilisateur. */
  offsetLng: number;
  offsetLat: number;
  /**
   * Cap en degres (0 = nord, 90 = est). Aligne le vehicule sur l'axe de sa
   * rue. En production, viendra du GPS du chauffeur ; ici, des valeurs
   * variees pour que la carte ne montre pas cinq vehicules paralleles.
   */
  bearing: number;
};

/**
 * Vehicules disposes autour de l'utilisateur. Melange motos et voitures :
 * l'app propose les deux categories (Moto / Eco / Confort), la carte doit le
 * refleter des l'accueil.
 */
export const NEARBY_VEHICLES: NearbyVehicle[] = [
  { id: 'v1', kind: 'moto', offsetLng: -0.0042, offsetLat: 0.0031, bearing: 118 },
  { id: 'v2', kind: 'car', offsetLng: 0.0035, offsetLat: 0.0022, bearing: 205 },
  { id: 'v3', kind: 'moto', offsetLng: 0.0028, offsetLat: -0.0034, bearing: 42 },
  { id: 'v4', kind: 'car', offsetLng: -0.0051, offsetLat: -0.0019, bearing: 330 },
  { id: 'v5', kind: 'moto', offsetLng: 0.0012, offsetLat: 0.0047, bearing: 165 },
];

export const SHORTCUTS: Shortcut[] = [
  { id: 'home', label: 'Maison', icon: 'home' },
  { id: 'work', label: 'Travail', icon: 'briefcase' },
  { id: 'airport', label: 'Aéroport', icon: 'airplane' },
];

/** Quartier affiche dans le badge. Viendra du reverse-geocoding. */
export const DEMO_AREA_LABEL = 'Bonapriso';

export const DEMO_USER_INITIAL = 'M';
