import React from 'react';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

export type VehicleKind = 'moto' | 'car';

type Props = {
  kind: VehicleKind;
  /**
   * Cap en degres (0 = le vehicule pointe vers le haut de l'ecran, 90 = vers
   * la droite). Sert a aligner le vehicule sur l'axe de sa rue.
   */
  bearing?: number;
};

/**
 * Vehicule vu de DESSUS, dessine en SVG.
 *
 * Vu de dessus et non de cote : c'est la seule projection coherente avec une
 * carte, et la seule qui rende l'orientation lisible. Une icone vue de cote ne
 * peut pas "suivre" une rue.
 *
 * Le volume vient de trois couches empilees — ombre portee, carrosserie,
 * vitrage — plutot que d'un aplat. Sans elles, la silhouette se lit comme un
 * pictogramme et non comme un vehicule pose sur la chaussee.
 */
export function VehicleMarker({ kind, bearing = 0 }: Props) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <G rotation={bearing} origin="20, 20">
        {kind === 'car' ? <CarShape /> : <MotoShape />}
      </G>
    </Svg>
  );
}

/**
 * Berline vue de dessus, capot vers le haut.
 * Feux arriere rouges en bas : ils donnent instantanement le sens de marche.
 */
function CarShape() {
  return (
    <G>
      {/* Ombre portee, legerement decalee vers le bas. */}
      <Rect
        x={11.4}
        y={7.4}
        width={17.2}
        height={26}
        rx={6}
        fill="rgba(16, 24, 40, 0.22)"
      />

      {/* Carrosserie. */}
      <Rect x={11} y={6} width={18} height={26} rx={6} fill="#F7F8F9" />
      <Rect
        x={11}
        y={6}
        width={18}
        height={26}
        rx={6}
        fill="none"
        stroke="#C9CDD3"
        strokeWidth={0.9}
      />

      {/* Pare-brise avant, plus large que la lunette arriere. */}
      <Path
        d="M13.6 13.4 C15.4 11.9, 24.6 11.9, 26.4 13.4 L25.4 17.2 L14.6 17.2 Z"
        fill="#1F2733"
      />

      {/* Pavillon. */}
      <Rect x={13.4} y={17.6} width={13.2} height={6.4} rx={1.6} fill="#2B3442" />

      {/* Lunette arriere. */}
      <Path
        d="M14.6 24.6 L25.4 24.6 L26.2 28 C24.4 29.3, 15.6 29.3, 13.8 28 Z"
        fill="#1F2733"
      />

      {/* Retroviseurs. */}
      <Rect x={9.6} y={16.4} width={2.2} height={3} rx={1} fill="#D8DBE0" />
      <Rect x={28.2} y={16.4} width={2.2} height={3} rx={1} fill="#D8DBE0" />

      {/* Feux avant. */}
      <Rect x={13.2} y={6.6} width={4} height={1.7} rx={0.85} fill="#FFF4D6" />
      <Rect x={22.8} y={6.6} width={4} height={1.7} rx={0.85} fill="#FFF4D6" />

      {/* Feux arriere : le repere de direction. */}
      <Rect x={12.8} y={29.9} width={4.6} height={1.9} rx={0.95} fill="#E5484D" />
      <Rect x={22.6} y={29.9} width={4.6} height={1.9} rx={0.95} fill="#E5484D" />
    </G>
  );
}

/**
 * Moto vue de dessus — la categorie la plus utilisee au Cameroun.
 * Plus etroite que la voiture, pour que les deux se distinguent d'un coup
 * d'oeil sans avoir a les comparer.
 */
function MotoShape() {
  return (
    <G>
      <Ellipse cx={20} cy={20.8} rx={5.4} ry={11.4} fill="rgba(16, 24, 40, 0.2)" />

      {/* Roues. */}
      <Rect x={18.6} y={7.4} width={2.8} height={6.4} rx={1.4} fill="#2B3442" />
      <Rect x={18.6} y={26.4} width={2.8} height={6.6} rx={1.4} fill="#2B3442" />

      {/* Chassis. */}
      <Path
        d="M20 9.4 C17.6 13, 17.2 16.4, 17.4 20 C17.6 23.6, 18.2 26.6, 20 29.6 C21.8 26.6, 22.4 23.6, 22.6 20 C22.8 16.4, 22.4 13, 20 9.4 Z"
        fill="#F7F8F9"
        stroke="#C9CDD3"
        strokeWidth={0.9}
      />

      {/* Guidon. */}
      <Rect x={13.8} y={13.2} width={12.4} height={2.1} rx={1.05} fill="#2B3442" />

      {/* Selle. */}
      <Rect x={17.6} y={19.4} width={4.8} height={7.2} rx={2.2} fill="#2B3442" />

      {/* Phare avant. */}
      <Rect x={18.4} y={10.4} width={3.2} height={1.8} rx={0.9} fill="#FFF4D6" />

      {/* Feu arriere. */}
      <Rect x={18.6} y={28.4} width={2.8} height={1.6} rx={0.8} fill="#E5484D" />
    </G>
  );
}

const SIZE = 38;
