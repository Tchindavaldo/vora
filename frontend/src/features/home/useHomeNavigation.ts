/**
 * Ecrans pleins superposes a l'accueil : recherche, historique, profil,
 * contacts d'urgence et assistance.
 *
 * L'app n'a pas de librairie de navigation (R18 : aucune dependance sans
 * necessite) — chaque ecran plein est un etat de `HomeScreen` qui remplace son
 * rendu. Regrouper ces etats ici garde l'ecran sous le plafond de taille (R4)
 * et rassemble en un endroit la question "qu'est-ce qui est affiche".
 */

import { useState } from 'react';

/**
 * `null` = accueil. `search` porte la saisie initiale (eventuellement vide),
 * les autres n'ont pas de parametre.
 */
export type HomeRoute =
  | { name: 'search'; query: string }
  | { name: 'history' }
  | { name: 'profile' }
  | { name: 'contacts' }
  | { name: 'support' }
  | { name: 'notifications' }
  | { name: 'wallet' }
  | null;

export function useHomeNavigation() {
  const [route, setRoute] = useState<HomeRoute>(null);

  return {
    route,
    /** Ouvre la recherche, avec une amorce venue d'un raccourci si besoin. */
    openSearch: (query = '') => setRoute({ name: 'search', query }),
    openHistory: () => setRoute({ name: 'history' }),
    openProfile: () => setRoute({ name: 'profile' }),
    openContacts: () => setRoute({ name: 'contacts' }),
    openSupport: () => setRoute({ name: 'support' }),
    openNotifications: () => setRoute({ name: 'notifications' }),
    openWallet: () => setRoute({ name: 'wallet' }),
    /** Revient a l'accueil. */
    close: () => setRoute(null),
  };
}
