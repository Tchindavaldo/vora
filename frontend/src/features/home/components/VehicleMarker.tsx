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
      {/* Ombre portee. */}
      <Path d={CAR_BODY} fill="rgba(16, 24, 40, 0.24)" translateY={1.1} />

      {/* Carrosserie : capot effile a l'avant, arriere plus carre. Un simple
          rectangle arrondi donnait une gelule, pas une berline. */}
      <Path d={CAR_BODY} fill="#FAFBFC" stroke="#B9BFC7" strokeWidth={0.8} />

      {/* Retroviseurs, au niveau du montant avant. */}
      <Path d="M10.5 17.4 L12.2 17 L12.2 19.4 L10.5 19.2 Z" fill="#D6DAE0" />
      <Path d="M29.5 17.4 L27.8 17 L27.8 19.4 L29.5 19.2 Z" fill="#D6DAE0" />

      {/* Pare-brise : trapeze inverse, plus etroit en haut. */}
      <Path d="M14.9 15.1 L25.1 15.1 L24 18.7 L16 18.7 Z" fill="#25303D" />

      {/* Pavillon, entre les deux vitrages. */}
      <Path d="M15.5 19.3 L24.5 19.3 L24.5 23.6 L15.5 23.6 Z" fill="#39434F" />

      {/* Lunette arriere, plus courte que le pare-brise. */}
      <Path d="M16.1 24.2 L23.9 24.2 L24.8 27.3 L15.2 27.3 Z" fill="#25303D" />

      {/* Feux avant. */}
      <Path d="M14.6 7.6 L17.6 7.1 L17.6 8.9 L14.7 9.2 Z" fill="#FFF6DC" />
      <Path d="M25.4 7.6 L22.4 7.1 L22.4 8.9 L25.3 9.2 Z" fill="#FFF6DC" />

      {/* Feux arriere : le repere de sens de marche. */}
      <Path d="M13.6 30.4 L17.4 30.4 L17.4 32.2 L13.9 32 Z" fill="#E5484D" />
      <Path d="M26.4 30.4 L22.6 30.4 L22.6 32.2 L26.1 32 Z" fill="#E5484D" />
    </G>
  );
}

/**
 * Contour de la carrosserie, capot vers le haut.
 * L'avant se retrecit (calandre etroite), les flancs se galbent au niveau de
 * l'habitacle, l'arriere reste large et presque droit.
 */
const CAR_BODY =
  'M20 5.6 C17.4 5.6, 15 6.4, 14 7.6 C12.8 9.2, 12.2 12, 12.1 15.4 ' +
  'C12 19.4, 12 24.6, 12.3 28.4 C12.5 30.8, 13 32.6, 14.2 33.4 ' +
  'C15.6 34.3, 24.4 34.3, 25.8 33.4 C27 32.6, 27.5 30.8, 27.7 28.4 ' +
  'C28 24.6, 28 19.4, 27.9 15.4 C27.8 12, 27.2 9.2, 26 7.6 ' +
  'C25 6.4, 22.6 5.6, 20 5.6 Z';

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
