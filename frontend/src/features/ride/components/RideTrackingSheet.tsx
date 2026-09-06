import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  radius,
  shadows,
  SHEET_HEIGHT,
  spacing,
  typography,
} from '../../../theme';
import { formatXaf, TIER_LABELS } from '../../../services/pricing';
import { METHOD_LABELS } from '../../../services/payment';
import type { Driver, Ride } from '../../../services/rides';

type Props = {
  ride: Ride;
  driver: Driver;
  onCancel: () => void;
  onSos: () => void;
  onShare: () => void;
  /** Ouvre le signalement du chauffeur (R10). */
  onReport: () => void;
  /** Ferme l'ecran de course terminee et revient a l'accueil. */
  onDone: () => void;
};

/**
 * Suivi de la course, du chauffeur trouve a la fin du trajet (R17 etape 8).
 *
 * Un seul panneau pour les quatre statuts : le passager suit une progression,
 * pas quatre ecrans differents. Seuls le titre, les actions et la couleur de
 * l'indicateur changent — remonter et redescendre un sheet a chaque transition
 * ferait sauter la carte.
 *
 * NOTE : panneau dedie a la feature `ride` (R16), independant du `FareSheet`.
 */
export function RideTrackingSheet({
  ride,
  driver,
  onCancel,
  onSos,
  onShare,
  onReport,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();

  const isFinished = ride.status === 'completed';
  // Une fois le passager a bord, il n'annule plus : il descend. Le bouton
  // laisse la place aux actions de securite.
  const canCancel = ride.status === 'accepted' || ride.status === 'arrived';
  const showSafety = ride.status === 'arrived' || ride.status === 'in_progress';

  return (
    <View
      style={[
        styles.sheet,
        {
          // Voir DestinationSheet : la marge systeme s'ajoute a la hauteur.
          height: SHEET_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.status}>{statusTitle(ride)}</Text>

          {/*
            Le signalement reste accessible APRES la descente : c'est souvent
            une fois hors du vehicule que le passager ose signaler. En pastille
            dans l'en-tete, a l'oppose du titre — presente sans peser, et jamais
            confondue avec les actions du bas.
          */}
          {(showSafety || isFinished) && (
            <Pressable
              onPress={onReport}
              style={styles.report}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Signaler ce chauffeur"
            >
              <Ionicons name="flag-outline" size={12} color={colors.textMuted} />
              <Text style={styles.reportLabel}>Signaler</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.driver}>
          {driver.photoUrl !== null ? (
            <Image source={{ uri: driver.photoUrl }} style={styles.photo} />
          ) : (
            // Pas de photo : l'initiale, plutot qu'une silhouette generique qui
            // n'identifie personne.
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.initial}>{driver.name.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {driver.name}
            </Text>

            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={styles.ratingValue}>{driver.rating.toFixed(1)}</Text>
              <Text style={styles.ridesCount}>
                ({driver.ridesCount} courses)
              </Text>
            </View>
          </View>

          {/*
            Plaque et modele mis en avant : c'est ce que le passager compare au
            vehicule qui se presente devant lui, et un point de securite
            explicite du brief (R10).
          */}
          <View style={styles.vehicle}>
            <Text style={styles.plate}>{driver.plate}</Text>
            <Text style={styles.model} numberOfLines={1}>
              {driver.vehicleModel}
            </Text>
          </View>
        </View>

        <View style={styles.trip}>
          <Text style={styles.tripLine} numberOfLines={1}>
            {TIER_LABELS[ride.tier]} · {ride.destinationLabel}
          </Text>
          <Text style={styles.amount}>{formatXaf(ride.amountXaf)}</Text>
        </View>

        {/*
          Comment le passager paie, sous le montant : la carte especes en
          dessous detaille le billet, mais elle n'apparait qu'en especes. Cette
          ligne-ci vaut pour les trois modes.
        */}
        <View style={styles.method}>
          <Text style={styles.methodLabel}>Mode de paiement</Text>
          <Text style={styles.methodValue}>{METHOD_LABELS[ride.method]}</Text>
        </View>

        {/*
          Especes : le billet annonce et la monnaie a rendre, visibles jusqu'a la
          descente. Le chauffeur a la meme ligne sous les yeux — c'est ce qui
          evite la discussion a l'arrivee.
        */}
        {ride.cash !== null && (
          <View style={styles.cash}>
            <Ionicons name="cash" size={18} color={colors.primary} />
            <Text style={styles.cashText} numberOfLines={2}>
              Espèces : vous donnez {formatXaf(ride.cash.billXaf)} ·{' '}
              {ride.cash.changeXaf === 0
                ? 'appoint exact'
                : `le chauffeur vous rend ${formatXaf(ride.cash.changeXaf)}`}
            </Text>
          </View>
        )}

        {/*
          Securite pendant le trajet (R10) : partage de course et appel
          d'urgence, accessibles sans quitter l'ecran de suivi. Ils
          n'apparaissent qu'a partir du moment ou le passager est au contact du
          vehicule — avant, ils n'auraient rien a signaler.
        */}
        {showSafety && (
          <View style={styles.safety}>
            <Pressable
              onPress={onShare}
              style={styles.share}
              accessibilityRole="button"
              accessibilityLabel="Partager ma course"
            >
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text style={styles.shareLabel}>Partager la course</Text>
            </Pressable>

            <Pressable
              onPress={onSos}
              style={styles.sos}
              accessibilityRole="button"
              accessibilityLabel="Alerte d’urgence"
            >
              <Ionicons name="warning" size={18} color={colors.surface} />
              <Text style={styles.sosLabel}>SOS</Text>
            </Pressable>
          </View>
        )}

        {/* Donnees de demonstration : jamais presentees comme reelles (R13). */}
        <Text style={styles.simulated}>
          Course simulée — chauffeur et progression de démonstration.
        </Text>

        {/*
          Annulation en bas du panneau, pleine largeur : tant que le chauffeur
          n'est pas la, c'est l'action que le passager cherche — une croix de
          22 px en haut du sheet se rate au pouce, et se confond avec un simple
          "fermer".
        */}
        {canCancel && (
          <Pressable
            onPress={onCancel}
            style={styles.cancel}
            accessibilityRole="button"
            accessibilityLabel="Annuler la course"
          >
            <Text style={styles.cancelLabel}>Annuler la course</Text>
          </Pressable>
        )}

        {isFinished && (
          <Pressable
            onPress={onDone}
            style={styles.done}
            accessibilityRole="button"
            accessibilityLabel="Terminer et revenir à l’accueil"
          >
            <Text style={styles.doneLabel}>Terminer</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/** Phrase d'etat affichee en tete du panneau. */
function statusTitle(ride: Ride): string {
  switch (ride.status) {
    case 'accepted':
      return ride.etaMinutes !== null
        ? `Arrive dans ${ride.etaMinutes} min`
        : 'Votre chauffeur arrive';
    case 'arrived':
      return 'Votre chauffeur est arrivé';
    case 'in_progress':
      return 'Course en cours';
    case 'completed':
      return 'Course terminée';
    default:
      return 'Course';
  }
}

const PHOTO = 52;

const styles = StyleSheet.create({
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  status: {
    ...typography.subtitle,
    flex: 1,
  },
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
  },
  photoFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.title,
    color: colors.primary,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  name: typography.subtitle,
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    ...typography.label,
    color: colors.text,
  },
  ridesCount: typography.caption,
  vehicle: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  plate: {
    ...typography.subtitle,
    letterSpacing: 1,
  },
  model: typography.caption,
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripLine: {
    ...typography.label,
    flex: 1,
  },
  amount: typography.subtitle,
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  methodLabel: typography.caption,
  methodValue: {
    ...typography.label,
    color: colors.text,
  },
  cash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  cashText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  safety: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  share: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  shareLabel: {
    ...typography.label,
    color: colors.text,
  },
  // Le SOS ne se cherche pas : plein, contraste, a place fixe.
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  sosLabel: {
    ...typography.label,
    color: colors.surface,
  },
  // Pastille discrete : bordure seule, pas de fond plein — elle ne doit pas
  // concurrencer le titre qu'elle accompagne.
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  reportLabel: typography.caption,
  simulated: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  cancel: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  done: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  doneLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
});
