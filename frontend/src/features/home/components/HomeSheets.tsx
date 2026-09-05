import React from 'react';

import { DestinationSheet, type Shortcut } from './DestinationSheet';
import { FareSheet } from '../../booking/components/FareSheet';
import { PaymentSheet } from '../../payment/components/PaymentSheet';
import { CashChangeSheet } from '../../payment/components/CashChangeSheet';
import { SearchingDriverSheet } from '../../ride/components/SearchingDriverSheet';
import { RideTrackingSheet } from '../../ride/components/RideTrackingSheet';
import { RatingSheet } from '../../ride/components/RatingSheet';
import { EmergencySheet } from '../../ride/components/EmergencySheet';
import { ReportSheet } from '../../ride/components/ReportSheet';
import type { useBookingFlow } from '../../booking/useBookingFlow';
import type { usePayment } from '../../payment/usePayment';
import type { useRideRequest } from '../../ride/useRideRequest';
import type { useRideRating } from '../../ride/useRideRating';
import type { RideSafety } from '../../ride/useRideSafety';
import type { EmergencyContact } from '../../../services/safety';
import type { useRideOrder } from '../useRideOrder';

type Props = {
  booking: ReturnType<typeof useBookingFlow>;
  payment: ReturnType<typeof usePayment>;
  ride: ReturnType<typeof useRideRequest>;
  order: ReturnType<typeof useRideOrder>;
  rating: ReturnType<typeof useRideRating>;
  safety: RideSafety;
  emergencyContacts: EmergencyContact[];
  shortcuts: Shortcut[];
  isRating: boolean;
  onSearchPress: () => void;
  onShortcutPress: (shortcut: Shortcut) => void;
  onCancelRide: () => void;
  onRideDone: () => void;
  onOpenComment: () => void;
  onRatingClose: () => void;
};

/**
 * LE panneau bas de l'accueil, selon l'avancement du parcours.
 *
 * Un seul panneau a la fois, jamais empile : saisie de destination, estimation,
 * paiement, monnaie, recherche de chauffeur, suivi, evaluation, et par-dessus
 * tout cela l'urgence et le signalement. Ils repondent tous a la meme question
 * — "ou en est ma course" — et les empiler laisserait un champ de recherche
 * sous un trajet deja choisi.
 *
 * Sorti de `HomeScreen` pour le garder sous le plafond de taille (R4) : cette
 * cascade est une responsabilite a elle seule, celle de choisir l'ecran du bas.
 */
export function HomeSheets({
  booking,
  payment,
  ride,
  order,
  rating,
  safety,
  emergencyContacts,
  shortcuts,
  isRating,
  onSearchPress,
  onShortcutPress,
  onCancelRide,
  onRideDone,
  onOpenComment,
  onRatingClose,
}: Props) {
  // Urgence et signalement passent DEVANT le suivi : ouverts, ils sont ce que
  // le passager regarde. Ils se referment sur la course, restee en place.
  if (safety.panel === 'sos') {
    return (
      <EmergencySheet
        contacts={emergencyContacts}
        step={safety.alertStep}
        error={safety.alertError}
        onTriggerAlert={safety.triggerAlert}
        onCallContact={safety.callContact}
        onCallSupport={safety.callSupport}
        onClose={safety.close}
      />
    );
  }

  if (safety.panel === 'report' && ride.ride?.driver != null) {
    return (
      <ReportSheet
        driverName={ride.ride.driver.name}
        reason={safety.reportReason}
        onSelectReason={safety.setReportReason}
        details={safety.reportDetails}
        onChangeDetails={safety.setReportDetails}
        step={safety.reportStep}
        error={safety.reportError}
        onSubmit={safety.sendReport}
        onClose={safety.close}
      />
    );
  }

  if (isRating && ride.ride !== null && ride.ride.driver !== null) {
    return (
      <RatingSheet
        ride={ride.ride}
        driver={ride.ride.driver}
        stars={rating.stars}
        onSelectStars={rating.setStars}
        isSent={rating.isSent}
        onNext={onOpenComment}
        onClose={onRatingClose}
      />
    );
  }

  if (
    ride.isCreating ||
    ride.error !== null ||
    (ride.ride !== null && ride.ride.status === 'searching')
  ) {
    return (
      <SearchingDriverSheet
        destinationLabel={booking.choice?.place.label ?? ''}
        tier={booking.selectedTier}
        amountXaf={
          booking.fares.find((item) => item.tier === booking.selectedTier)
            ?.amountXaf ?? 0
        }
        error={ride.error}
        notice={ride.ride?.declineReason ?? null}
        onRetry={order.order}
        onCancel={onCancelRide}
      />
    );
  }

  if (ride.ride !== null && ride.ride.driver !== null) {
    return (
      <RideTrackingSheet
        ride={ride.ride}
        driver={ride.ride.driver}
        onCancel={onCancelRide}
        onSos={safety.openSos}
        onShare={safety.share}
        onReport={safety.openReport}
        onDone={onRideDone}
      />
    );
  }

  if (order.isPaying && payment.step === 'cash' && booking.choice !== null) {
    return (
      <CashChangeSheet
        destinationLabel={booking.choice.place.label}
        distanceMeters={booking.distanceMeters}
        tier={booking.selectedTier}
        amountXaf={order.selectedFare?.amountXaf ?? 0}
        billInput={payment.billInput}
        onChangeBill={payment.setBillInput}
        offer={order.cashOffer}
        onOrder={order.orderWithCash}
        onBack={payment.back}
      />
    );
  }

  if (order.isPaying && booking.choice !== null) {
    return (
      <PaymentSheet
        destinationLabel={booking.choice.place.label}
        distanceMeters={booking.distanceMeters}
        tier={booking.selectedTier}
        amountXaf={order.selectedFare?.amountXaf ?? 0}
        selectedMethod={payment.method}
        onSelectMethod={payment.selectMethod}
        payment={payment.payment}
        isProcessing={payment.isProcessing}
        isSettled={payment.isSettled}
        onNext={order.nextFromPayment}
        onContinue={order.order}
        onBack={order.cancelPayment}
      />
    );
  }

  if (booking.choice === null) {
    return (
      <DestinationSheet
        shortcuts={shortcuts}
        onSearchPress={onSearchPress}
        onShortcutPress={onShortcutPress}
      />
    );
  }

  return (
    <FareSheet
      destinationLabel={booking.choice.place.label}
      fares={booking.fares}
      selectedTier={booking.selectedTier}
      onSelectTier={booking.selectTier}
      distanceMeters={booking.distanceMeters}
      isLoading={booking.isLoading}
      error={booking.error}
      onRetry={booking.retry}
      onConfirm={order.goToPayment}
      onCancel={booking.cancel}
    />
  );
}
