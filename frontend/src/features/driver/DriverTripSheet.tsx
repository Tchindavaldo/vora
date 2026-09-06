import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, SHEET_HEIGHT, spacing, typography } from '../../theme';
import { formatXaf } from '../../services/pricing';
import { METHOD_LABELS } from '../../services/payment';
import { type DriverRideRequest, type DriverTripStage } from './driverRequests';

type Props = {
  request: DriverRideRequest;
  stage: DriverTripStage;
  /** Vrai tant que les deux itineraires sont en cours de calcul. */
  isRouteLoading?: boolean;
  onAdvance: () => void;
  onFinish: () => void;
};

const STAGE_TITLE: Record<DriverTripStage, string> = {
  to_pickup: 'En route vers le client',
  arrived: 'Vous êtes arrivé',
  in_progress: 'Course en cours',
  completed: 'Course terminée',
};

const STAGE_ACTION_LABEL: Record<Exclude<DriverTripStage, 'completed'>, string> = {
  to_pickup: 'Je suis arrivé',
  arrived: 'Démarrer la course',
  in_progress: 'Terminer la course',
};

/**
 * Panneau bas de la course chauffeur (R16).
 *
 * Copie dediee de `RideTrackingSheet` (feature `ride`, cote passager) : meme
 * gabarit de sheet, mais contenu propre au chauffeur — progression en quatre
 * etapes puis encaissement, pas de securite ni de suivi de chauffeur.
 */
export function DriverTripSheet({
  request,
  stage,
  isRouteLoading = false,
  onAdvance,
  onFinish,
}: Props) {
  const insets = useSafeAreaInsets();
  const isCompleted = stage === 'completed';

  return (
    <View
      style={[
        styles.sheet,
        {
          height: SHEET_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/*
        Pendant le calcul des itineraires, le panneau ne montre QUE le loader,
        centre — comme le `FareSheet` cote passager (R16) : l'etape et le
        bouton d'action n'ont rien a dire tant que le trajet est inconnu, et
        les afficher ferait sauter la mise en page quand le trace arrive.
      */}
      {isRouteLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Calcul de l’itinéraire…</Text>
        </View>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.status}>{STAGE_TITLE[stage]}</Text>

        <View style={styles.routeRow}>
          <View style={styles.routeIcons}>
            <View style={styles.dotOrigin} />
            <View style={styles.routeLine} />
            <Ionicons name="location" size={14} color={colors.primary} />
          </View>

          <View style={styles.routeLabels}>
            <Text style={styles.routeLabel} numberOfLines={1}>
              {request.pickupLabel}
            </Text>
            <Text style={styles.routeLabel} numberOfLines={1}>
              {request.destinationLabel}
            </Text>
          </View>
        </View>

        <StageSteps stage={stage} />

        {/*
          Detail du paiement en lignes separees, visible sur TOUTES les etapes
          y compris la derniere (R17 etape 9) : c'est l'innovation a demontrer
          du debut a la fin, le chauffeur doit pouvoir la relire au moment
          meme ou il encaisse, pas seulement avant.
        */}
        <View style={styles.paymentBox}>
          <PaymentLine label="Mode de paiement" value={METHOD_LABELS[request.method]} />
          <PaymentLine
            label="Le client paie"
            value={
              request.cash !== null ? formatXaf(request.cash.billXaf) : formatXaf(request.earningsXaf)
            }
          />
          {request.cash !== null && request.cash.changeXaf > 0 && (
            <PaymentLine
              label="Vous devrez rembourser"
              value={formatXaf(request.cash.changeXaf)}
              emphasis
            />
          )}
          <PaymentLine label="Vous gagnez" value={formatXaf(request.earningsXaf)} emphasis />
        </View>

        <Pressable
          style={styles.actionButton}
          onPress={isCompleted ? onFinish : onAdvance}
          accessibilityRole="button"
        >
          <Text style={styles.actionLabel}>
            {isCompleted ? 'Retour au tableau de bord' : STAGE_ACTION_LABEL[stage]}
          </Text>
        </Pressable>
      </ScrollView>
      )}
    </View>
  );
}

/** Une ligne du detail de paiement : libelle a gauche, montant a droite. */
function PaymentLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.paymentLine}>
      <Text style={styles.paymentLabel}>{label}</Text>
      <Text style={[styles.paymentValue, emphasis && styles.paymentValueEmphasis]}>{value}</Text>
    </View>
  );
}

function StageSteps({ stage }: { stage: DriverTripStage }) {
  const stages: DriverTripStage[] = ['to_pickup', 'arrived', 'in_progress', 'completed'];
  const currentIndex = stages.indexOf(stage);

  return (
    <View style={styles.stepsRow}>
      {stages.map((step, index) => (
        <View key={step} style={[styles.stepDot, index <= currentIndex && styles.stepDotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateText: typography.label,
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    ...shadows.sheet,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  status: typography.subtitle,
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeIcons: {
    alignItems: 'center',
    width: 14,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textFaint,
  },
  routeLine: {
    width: 1,
    flex: 1,
    minHeight: 16,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  routeLabel: typography.body,
  stepsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  paymentBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  paymentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  paymentLabel: typography.label,
  paymentValue: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  paymentValueEmphasis: {
    ...typography.subtitle,
    color: colors.primary,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  actionLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '700',
  },
});
