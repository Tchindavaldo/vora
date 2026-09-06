/**
 * Ecrans pleins superposes a l'accueil (recherche, historique, profil,
 * portefeuille, contacts, assistance, notifications).
 *
 * Ils sont rendus PAR-DESSUS l'accueil, jamais a la place : un `return`
 * anticipe dans `HomeScreen` demonterait `MapCanvas`, et le retour a l'accueil
 * rechargerait le style MapLibre — c'est ce qui produisait un flash de la carte
 * et lui faisait perdre son cadrage. En restant montee sous ce calque, la carte
 * retrouve exactement l'etat qu'elle avait.
 *
 * Extrait de `HomeScreen` pour tenir le plafond de taille (R4).
 */

import React from 'react';

import type { HomeRoute } from '../useHomeNavigation';
import type { Driver } from '../../../services/rides';
import type { RatingStars } from '../../../services/ratings';

import { RatingCommentScreen } from '../../ride/components/RatingCommentScreen';

import {
  DestinationSearchScreen,
  type DestinationChoice,
} from '../../search/DestinationSearchScreen';
import { EmergencyContactsScreen } from '../../profile/EmergencyContactsScreen';
import { NotificationsScreen } from '../../notifications/NotificationsScreen';
import { ProfileScreen } from '../../profile/ProfileScreen';
import { SupportScreen } from '../../support/SupportScreen';
import { TransactionHistoryScreen } from '../../history/TransactionHistoryScreen';
import { WalletScreen } from '../../wallet/WalletScreen';

type Navigation = {
  openProfile: () => void;
  openContacts: () => void;
  openSupport: () => void;
  openHistory: () => void;
  openWallet: () => void;
  close: () => void;
};

/**
 * Commentaire d'evaluation en cours de saisie, ou `null`. Il prime sur les
 * ecrans de navigation : la course n'est pas encore close.
 */
type CommentDraft = {
  driver: Driver;
  stars: RatingStars;
  text: string;
  isSending: boolean;
  error: string | null;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

type Props = {
  route: HomeRoute;
  comment: CommentDraft | null;
  nav: Navigation;
  origin: { longitude: number; latitude: number };
  userName: string;
  userInitial: string;
  onConfirmDestination: (choice: DestinationChoice) => void;
};

/** `null` quand aucun ecran plein n'est ouvert : l'accueil reste seul visible. */
export function HomeOverlay({
  route,
  comment,
  nav,
  origin,
  userName,
  userInitial,
  onConfirmDestination,
}: Props): React.ReactElement | null {
  if (comment !== null) {
    return (
      <RatingCommentScreen
        driver={comment.driver}
        stars={comment.stars}
        comment={comment.text}
        onChangeComment={comment.onChangeText}
        isSending={comment.isSending}
        error={comment.error}
        onSubmit={comment.onSubmit}
        onBack={comment.onBack}
      />
    );
  }

  if (route?.name === 'contacts') {
    return <EmergencyContactsScreen onClose={nav.openProfile} />;
  }

  // Assistance : la fermeture revient au profil, seule porte d'entree.
  if (route?.name === 'support') {
    return <SupportScreen onClose={nav.openProfile} />;
  }

  if (route?.name === 'profile') {
    return (
      <ProfileScreen
        userName={userName}
        userInitial={userInitial}
        onOpenEmergencyContacts={nav.openContacts}
        onOpenSupport={nav.openSupport}
        onOpenHistory={nav.openHistory}
        onOpenWallet={nav.openWallet}
        onClose={nav.close}
      />
    );
  }

  // Le portefeuille se ferme vers le profil, seule porte d'entree.
  if (route?.name === 'wallet') {
    return <WalletScreen onClose={nav.openProfile} />;
  }

  if (route?.name === 'history') {
    return <TransactionHistoryScreen onClose={nav.close} />;
  }

  if (route?.name === 'notifications') {
    return <NotificationsScreen onClose={nav.close} />;
  }

  if (route?.name === 'search') {
    return (
      <DestinationSearchScreen
        origin={origin}
        initialQuery={route.query}
        onClose={nav.close}
        onConfirm={onConfirmDestination}
      />
    );
  }

  return null;
}
