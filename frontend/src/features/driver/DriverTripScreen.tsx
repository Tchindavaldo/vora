import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DriverTripSheet } from './DriverTripSheet';
import type { DriverRideRequest, DriverTripStage } from './driverRequests';

type Props = {
  request: DriverRideRequest;
  stage: DriverTripStage;
  /** Vrai tant que les deux itineraires sont en cours de calcul. */
  isRouteLoading: boolean;
  onAdvance: () => void;
  onFinish: () => void;
  /** Ouvre l'urgence chauffeur (brief §10.3). */
  onSos: () => void;
  /** Ouvre le signalement du passager. */
  onReport: () => void;
};

/**
 * Course acceptee, jusqu'a l'encaissement (R17 etape 9).
 *
 * Ne rend QUE le panneau bas : la carte, les traces et le vehicule sont
 * montes une fois pour toutes par `DriverApp`, au-dessus duquel cet ecran se
 * pose. C'est ce qui permet de passer du tableau de bord a la course sans que
 * la carte ne se recharge.
 */
export function DriverTripScreen({
  request,
  stage,
  isRouteLoading,
  onAdvance,
  onFinish,
  onSos,
  onReport,
}: Props) {
  return (
    <View style={styles.sheetStack} pointerEvents="box-none">
      <DriverTripSheet
        request={request}
        stage={stage}
        isRouteLoading={isRouteLoading}
        onAdvance={onAdvance}
        onFinish={onFinish}
        onSos={onSos}
        onReport={onReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheetStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
