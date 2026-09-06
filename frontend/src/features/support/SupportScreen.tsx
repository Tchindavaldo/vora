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
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import { formatXaf } from '../../services/pricing';
import { formatTransactionDate } from '../../services/transactions';
import {
  FAQ_ENTRIES,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from '../../services/support';
import { useTransactions } from '../history/useTransactions';
import { useSupport } from './useSupport';
import { DisputeSheet } from './DisputeSheet';

type Props = {
  onClose: () => void;
};

/**
 * Assistance passager (brief §14) : contacter le support, questions
 * frequentes, litige sur une course.
 *
 * PLEIN ECRAN, comme l'historique et le profil : on y lit du texte, pas une
 * carte. Ouvert depuis la section Securite du profil.
 *
 * Ordre des blocs voulu : le CONTACT en premier, la FAQ ensuite. Un passager
 * qui ouvre cet ecran a deja un probleme — lui imposer de faire defiler une
 * liste de questions avant de trouver le numero serait une mauvaise reponse a
 * l'urgence qu'il ressent. Le litige vient en dernier : il suppose de choisir
 * une course, donc d'avoir deja roule.
 */
export function SupportScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const support = useSupport();
  // Les courses passees servent a designer celle qui pose probleme : un litige
  // porte toujours sur une course precise, jamais "en general".
  const { items: rides, isLoading, error } = useTransactions();

  const disputedRide = rides.find((ride) => ride.id === support.disputeRideId);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Retour a DROITE, comme sur les ecrans de profil : le pouce l'atteint
          sans changer de main sur un grand telephone. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Assistance</Text>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour au profil"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <SafeBottomArea>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>Nous contacter</Text>

          <Pressable
            style={styles.contact}
            onPress={support.callSupport}
            accessibilityRole="button"
            accessibilityLabel={`Appeler l’assistance au ${SUPPORT_PHONE}`}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.contactBody}>
              <Text style={styles.contactLabel}>Appeler l’assistance</Text>
              <Text style={styles.contactHint}>
                {SUPPORT_PHONE} · {SUPPORT_HOURS}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>

          <Pressable
            style={styles.contact}
            onPress={support.emailSupport}
            accessibilityRole="button"
            accessibilityLabel={`Écrire à l’assistance à ${SUPPORT_EMAIL}`}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.contactBody}>
              <Text style={styles.contactLabel}>Écrire à l’assistance</Text>
              <Text style={styles.contactHint}>
                {SUPPORT_EMAIL} · réponse sous 48 h
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>

          <Text style={styles.section}>Questions fréquentes</Text>

          {/* Accordeon maison plutot qu'une librairie (R18) : une question
              ouverte a la fois, l'ecran reste parcourable. */}
          {FAQ_ENTRIES.map((entry) => {
            const isOpen = entry.id === support.openFaqId;

            return (
              <View key={entry.id} style={styles.faq}>
                <Pressable
                  style={styles.faqHead}
                  onPress={() => support.toggleFaq(entry.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={entry.question}
                >
                  <Text style={styles.faqQuestion}>{entry.question}</Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textFaint}
                  />
                </Pressable>

                {isOpen && <Text style={styles.faqAnswer}>{entry.answer}</Text>}
              </View>
            );
          })}

          <Text style={styles.section}>Litige sur une course</Text>

          <Text style={styles.sectionBody}>
            Montant incorrect, trajet non respecté, objet oublié : choisissez la
            course concernée, notre équipe la reprend avec le chauffeur.
          </Text>

          {isLoading ? (
            <View style={styles.ridesState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error !== null ? (
            // L'echec de lecture ne doit pas bloquer TOUT l'ecran : le numero du
            // support reste au-dessus, joignable (R8).
            <Text style={styles.ridesError}>
              {error} En attendant, appelez l’assistance ci-dessus.
            </Text>
          ) : rides.length === 0 ? (
            <Text style={styles.ridesEmpty}>
              Aucune course à contester pour l’instant.
            </Text>
          ) : (
            rides.map((ride) => (
              <Pressable
                key={ride.id}
                style={styles.ride}
                onPress={() => support.openDispute(ride.id)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir un litige sur la course vers ${ride.destinationLabel}`}
              >
                <View style={styles.rideBody}>
                  <Text style={styles.rideLabel} numberOfLines={1}>
                    {ride.destinationLabel}
                  </Text>
                  <Text style={styles.rideHint}>
                    {formatTransactionDate(ride.completedAt)} ·{' '}
                    {formatXaf(ride.amountXaf)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeBottomArea>

      {disputedRide !== undefined && (
        <DisputeSheet
          rideLabel={`${disputedRide.destinationLabel} · ${formatTransactionDate(
            disputedRide.completedAt,
          )}`}
          reason={support.disputeReason}
          onSelectReason={support.setDisputeReason}
          details={support.disputeDetails}
          onChangeDetails={support.setDisputeDetails}
          step={support.disputeStep}
          error={support.disputeError}
          onSubmit={support.sendDispute}
          onClose={support.closeDispute}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    ...typography.caption,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBody: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    ...typography.label,
    color: colors.text,
  },
  contactHint: typography.caption,
  faq: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqQuestion: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  ride: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rideBody: {
    flex: 1,
    gap: 2,
  },
  rideLabel: {
    ...typography.label,
    color: colors.text,
  },
  rideHint: typography.caption,
  ridesState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ridesError: {
    ...typography.caption,
    color: colors.danger,
  },
  ridesEmpty: typography.caption,
});
