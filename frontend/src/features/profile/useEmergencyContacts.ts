/**
 * Contacts d'urgence du passager (R10, brief §10).
 *
 * ⚠️ EN MEMOIRE pour la session, comme l'historique : en production ils sont
 * rattaches au compte cote backend, jamais au telephone seul — un passager qui
 * change d'appareil ne doit pas perdre ses contacts d'urgence. Quand l'API
 * arrivera, ce hook appellera `GET/POST /me/emergency-contacts` (R12).
 */

import { useCallback, useEffect, useState } from 'react';

import {
  DEMO_EMERGENCY_CONTACTS,
  type EmergencyContact,
} from '../../services/safety';

/**
 * Liste partagee au niveau du module : le panneau d'urgence de la course et
 * l'ecran de parametres doivent voir les MEMES contacts. Un etat par composant
 * afficherait deux listes divergentes.
 *
 * NOTE : c'est un cache de reponse backend, pas de l'etat d'application au sens
 * de R6 — d'ou l'absence de contexte tant qu'un seul ecran l'ecrit.
 */
let contacts: EmergencyContact[] = [...DEMO_EMERGENCY_CONTACTS];

/** Abonnes a prevenir quand la liste change, pour que les deux ecrans suivent. */
const listeners = new Set<(next: EmergencyContact[]) => void>();

function publish(next: EmergencyContact[]) {
  contacts = next;
  listeners.forEach((listener) => listener(next));
}

/** Lecture directe, pour les appelants hors composant (alerte d'urgence). */
export function getEmergencyContacts(): EmergencyContact[] {
  return contacts;
}

export type ContactDraft = {
  name: string;
  relation: string;
  phone: string;
};

/**
 * Valide une saisie de contact.
 *
 * Renvoie le message d'erreur a afficher, ou `null` si tout va bien. La
 * validation vit ici et non dans le composant : les memes regles serviront a
 * l'edition comme a la creation, et devront etre rejouees cote serveur (R10).
 */
export function validateContact(draft: ContactDraft): string | null {
  if (draft.name.trim().length === 0) return 'Indiquez un nom.';

  // Numeros camerounais et services d'urgence courts (117, 118) : on verifie la
  // forme, pas l'existence — seul un envoi reel peut la confirmer.
  const digits = draft.phone.replace(/[\s.-]/g, '');
  if (!/^\+?\d{3,15}$/.test(digits)) {
    return 'Numéro invalide. Exemple : +237690000011';
  }

  return null;
}

export function useEmergencyContacts() {
  const [items, setItems] = useState<EmergencyContact[]>(contacts);

  // Abonnement a la liste partagee : tout ecran qui l'affiche suit les ajouts
  // et suppressions faits ailleurs, sans passer par un contexte pour un etat
  // qui viendra du backend.
  useEffect(() => {
    listeners.add(setItems);
    setItems(contacts);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  const add = useCallback((draft: ContactDraft) => {
    const contact: EmergencyContact = {
      id: `c-${Date.now()}`,
      name: draft.name.trim(),
      relation: draft.relation.trim().length === 0 ? 'Proche' : draft.relation.trim(),
      phone: draft.phone.trim(),
    };
    publish([...contacts, contact]);
  }, []);

  const remove = useCallback((id: string) => {
    publish(contacts.filter((item) => item.id !== id));
  }, []);

  return { items, add, remove };
}
