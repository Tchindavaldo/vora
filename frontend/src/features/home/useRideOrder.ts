/**
 * Enchainement estimation -> paiement -> commande, extrait de `HomeScreen`.
 *
 * L'ecran d'accueil n'a plus qu'a cabler des boutons : tout ce qui decide
 * QUAND on passe au paiement, QUAND on commande et ce qu'on envoie au backend
 * vit ici. Sorti de l'ecran pour le garder lisible (R4).
 *
 * Le hook ne possede aucun etat de course : il orchestre `useBookingFlow`,
 * `usePayment` et `useRideRequest`, qui restent les sources de verite.
 */

import { useMemo, useState } from 'react';

import { computeCashOffer } from '../../services/payment';
import { recordTransaction } from '../../services/transactions';
import { requestNotificationPermission } from '../../services/notifications';
import type { RoutePoint } from '../../services/routing';
import type { useBookingFlow } from '../booking/useBookingFlow';
import type { usePayment } from '../payment/usePayment';
import type { useRideRequest } from '../ride/useRideRequest';

type Args = {
  origin: RoutePoint;
  booking: ReturnType<typeof useBookingFlow>;
  payment: ReturnType<typeof usePayment>;
  ride: ReturnType<typeof useRideRequest>;
};

export function useRideOrder({ origin, booking, payment, ride }: Args) {
  /**
   * Etape de paiement ouverte : le tarif est retenu, la course n'est pas encore
   * demandee. Un booleen d'ecran plutot qu'un etat dans `useBookingFlow` : la
   * reservation s'arrete au choix du tarif (voir architecture/ride.md).
   */
  const [isPaying, setIsPaying] = useState(false);

  const selectedFare = booking.fares.find(
    (item) => item.tier === booking.selectedTier,
  );

  /**
   * Monnaie en especes, recalculee a chaque frappe : le passager voit ce que le
   * chauffeur devra lui rendre avant meme de commander. `null` tant qu'aucune
   * somme n'est saisie.
   */
  const cashOffer = useMemo(() => {
    const bill = Number.parseInt(payment.billInput, 10);
    if (!Number.isFinite(bill) || bill <= 0 || selectedFare === undefined) {
      return null;
    }
    return computeCashOffer(selectedFare.amountXaf, bill);
  }, [payment.billInput, selectedFare]);

  /** "Commander" (estimation) : passe au choix du mode de paiement. */
  const goToPayment = () => {
    payment.reset();
    setIsPaying(true);
  };

  /** Ferme le paiement et revient a l'estimation, itineraire conserve. */
  const cancelPayment = () => {
    payment.reset();
    setIsPaying(false);
  };

  /**
   * Cree la course et lance la recherche d'un chauffeur.
   *
   * Le montant envoye est celui du palier retenu. Il sera recalcule par le
   * backend a l'arrivee de l'API : un prix venu du telephone ne fait pas foi
   * (R13).
   */
  const order = async () => {
    const choice = booking.choice;
    if (choice === null || selectedFare === undefined) return;

    await requestNotificationPermission();

    setIsPaying(false);

    ride.request({
      origin,
      destination: {
        longitude: choice.place.longitude,
        latitude: choice.place.latitude,
      },
      destinationLabel: choice.place.label,
      tier: selectedFare.tier,
      amountXaf: selectedFare.amountXaf,
      // Le chauffeur voit la monnaie a prevoir sur la demande de course : s'il
      // ne peut pas rendre, il refuse et la course repart vers un autre.
      cash: payment.method === 'cash' ? cashOffer : null,
      method: payment.method,
    });
  };

  /**
   * "Suivant" : les especes ouvrent la saisie de la monnaie, les autres modes
   * declenchent directement le debit — eux n'ont rien a annoncer au chauffeur.
   */
  const nextFromPayment = () => {
    if (selectedFare === undefined) return;

    if (payment.method === 'cash') {
      payment.openCash();
      return;
    }

    payment.confirm(selectedFare.amountXaf);
  };

  /**
   * Especes : la somme annoncee validee, on commande sans etape de paiement.
   * Le verdict `due` est enregistre au passage — c'est lui qui porte la monnaie
   * dans l'historique du paiement.
   */
  const orderWithCash = async () => {
    if (selectedFare === undefined) return;
    payment.confirm(selectedFare.amountXaf, cashOffer);
    await order();
  };

  /**
   * Course terminee et evaluee : on archive le recu, puis on efface tout et on
   * revient a l'accueil.
   *
   * L'archivage a lieu ICI et pas a la fin du suivi : c'est le dernier moment ou
   * la course, le paiement et la note sont connus ensemble. `recordTransaction`
   * ignore les courses non terminees et les doublons — un abandon en cours de
   * route ne laisse donc aucune trace dans l'historique.
   */
  const reset = (
    stars: number | null = null,
    /**
     * Verdict du reglement joue a l'arrivee : `succeeded` si la somme a ete
     * debitee (portefeuille, Mobile Money), `due` si elle a ete remise au
     * chauffeur en especes. Sans lui, le recu porterait l'etat de la commande
     * et non celui du paiement reel.
     */
    settledStatus: 'succeeded' | 'due' = 'due',
  ) => {
    const settled = payment.payment;
    if (
      ride.ride !== null &&
      settled !== null &&
      (settled.status === 'succeeded' || settled.status === 'due')
    ) {
      recordTransaction({
        ride: ride.ride,
        method: settled.method,
        status: settledStatus,
        cash: settled.cash,
        stars,
      });
    }

    ride.cancel();
    booking.cancel();
    payment.reset();
    setIsPaying(false);
  };

  return {
    isPaying,
    selectedFare,
    cashOffer,
    goToPayment,
    cancelPayment,
    nextFromPayment,
    order,
    orderWithCash,
    reset,
  };
}
