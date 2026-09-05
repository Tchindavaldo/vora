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
};

/**
 * Vehicules disposes autour de l'utilisateur. Melange motos et voitures :
 * l'app propose les deux categories (Moto / Eco / Confort), la carte doit le
 * refleter des l'accueil.
 */
export const NEARBY_VEHICLES: NearbyVehicle[] = [
  { id: 'v1', kind: 'moto', offsetLng: -0.0042, offsetLat: 0.0031 },
  { id: 'v2', kind: 'car', offsetLng: 0.0035, offsetLat: 0.0022 },
  { id: 'v3', kind: 'moto', offsetLng: 0.0028, offsetLat: -0.0034 },
  { id: 'v4', kind: 'car', offsetLng: -0.0051, offsetLat: -0.0019 },
  { id: 'v5', kind: 'moto', offsetLng: 0.0012, offsetLat: 0.0047 },
];

export const SHORTCUTS: Shortcut[] = [
  { id: 'home', label: 'Maison', icon: 'home' },
  { id: 'work', label: 'Travail', icon: 'briefcase' },
  { id: 'airport', label: 'Aéroport', icon: 'airplane' },
];

/** Quartier affiche dans le badge. Viendra du reverse-geocoding. */
export const DEMO_AREA_LABEL = 'Bonapriso';

export const DEMO_USER_INITIAL = 'M';
