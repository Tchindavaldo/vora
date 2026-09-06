import React, { useMemo } from 'react';

import type { MapMarker } from '../map/MapCanvas';
import type { RoadPoint } from '../../services/roads';
import type { RoutePoint } from '../../services/routing';
import { UserLocationDot } from './components/UserLocationDot';
import { VehicleMarker, type VehicleKind } from './components/VehicleMarker';
import { DestinationPin } from '../booking/components/DestinationPin';
import { NEARBY_VEHICLES } from './demoData';
import type { VehicleMotion } from './useVehicleMotion';

/** Position animee du chauffeur : coordonnees plus cap du segment courant. */
type DriverPosition = (RoutePoint & { bearing: number }) | null;

type Params = {
  coords: RoutePoint;
  /** Vrai quand la position affichee est une ville par defaut, pas le GPS. */
  isFallbackLocation: boolean;
  /** Positions posees sur de vraies rues ; `null` = pas encore connues. */
  roadPoints: RoadPoint[] | null;
  /** Positions animees des vehicules alentour, par index. */
  motions: (VehicleMotion | undefined)[];
  destination: RoutePoint | null;
  driverPosition: DriverPosition;
  driverKind: VehicleKind;
  /**
   * Categorie retenue dans le panneau d'estimation. Quand elle est fournie, la
   * carte ne montre que les vehicules de cette categorie : l'utilisateur voit
   * immediatement l'offre reelle derriere le prix qu'il compare.
   * `null` = accueil, toutes categories confondues.
   */
  vehicleFilter: VehicleKind | null;
};

/**
 * Marqueurs de la carte d'accueil : vehicules alentour, position utilisateur,
 * destination, chauffeur de la course.
 *
 * Sorti de `HomeScreen` pour que l'ecran reste sous le plafond de taille (R4) :
 * la composition de la carte est une question a part entiere, avec ses propres
 * regles d'affichage.
 */
export function useHomeMarkers({
  coords,
  isFallbackLocation,
  roadPoints,
  motions,
  destination,
  driverPosition,
  driverKind,
  vehicleFilter,
}: Params): MapMarker[] {
  // Une fois un chauffeur assigne, la carte ne montre plus QUE le sien : les
  // vehicules disponibles alentour n'ont plus rien a dire, et les laisser
  // rendrait impossible de suivre celui qui vient vous chercher.
  const hasAssignedDriver = driverPosition !== null;

  return useMemo<MapMarker[]>(() => {
    // Les vehicules alentour sont toujours affiches des qu'on a une position
    // reelle. Tant que les rues ne sont pas connues, ils prennent leur offset
    // de demonstration autour de l'utilisateur, puis se reposent sur la
    // chaussee quand la carte a repondu. Les laisser absents jusque-la donnait
    // un accueil vide, ou aucun chauffeur ne semblait disponible.
    const markers: MapMarker[] =
      isFallbackLocation || hasAssignedDriver
        ? []
        : NEARBY_VEHICLES.flatMap((vehicle, index) => {
            // Filtre par categorie : on garde l'index d'origine, car `motions`
            // et `roadPoints` sont alignes sur NEARBY_VEHICLES.
            if (vehicleFilter !== null && vehicle.kind !== vehicleFilter) {
              return [];
            }

            // Position animee si elle existe, sinon la position posee sur la
            // route, sinon l'offset de demonstration (routes en echec, R8).
            const onRoad = motions[index] ?? roadPoints?.[index];

            return [
              {
                id: vehicle.id,
                longitude:
                  onRoad?.longitude ?? coords.longitude + vehicle.offsetLng,
                latitude:
                  onRoad?.latitude ?? coords.latitude + vehicle.offsetLat,
                render: () => (
                  <VehicleMarker
                    kind={vehicle.kind}
                    bearing={onRoad?.bearing ?? vehicle.bearing}
                  />
                ),
              },
            ];
          });

    // La position utilisateur n'est affichee que si elle est reelle : montrer
    // un point "vous etes ici" sur une ville par defaut serait un mensonge.
    if (!isFallbackLocation) {
      markers.push({
        id: 'user',
        longitude: coords.longitude,
        latitude: coords.latitude,
        render: () => <UserLocationDot />,
      });
    }

    // Destination de la course en preparation, a l'autre bout du trace.
    if (destination !== null) {
      markers.push({
        id: 'destination',
        longitude: destination.longitude,
        latitude: destination.latitude,
        render: () => <DestinationPin />,
      });
    }

    // Chauffeur de la course : seul vehicule affiche a partir de son
    // affectation, oriente dans son sens de marche.
    if (driverPosition !== null) {
      markers.push({
        id: 'driver',
        longitude: driverPosition.longitude,
        latitude: driverPosition.latitude,
        render: () => (
          <VehicleMarker kind={driverKind} bearing={driverPosition.bearing} />
        ),
      });
    }

    return markers;
  }, [
    coords,
    isFallbackLocation,
    roadPoints,
    motions,
    destination,
    hasAssignedDriver,
    driverPosition,
    driverKind,
    vehicleFilter,
  ]);
}
