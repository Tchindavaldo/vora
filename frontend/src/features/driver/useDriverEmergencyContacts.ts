/**
 * Contacts d'urgence du CHAUFFEUR (R10, brief §10.3).
 *
 * Copie dediee de `features/profile/useEmergencyContacts` (cote passager) —
 * R16. Meme mecanique, mais un registre SEPARE : les contacts d'un chauffeur ne
 * sont pas ceux d'un passager, et le meme telephone peut servir aux deux roles
 * en demonstration.
 *
 * ⚠️ EN MEMOIRE pour la session : en production ils sont rattaches au compte
 * chauffeur cote backend, jamais au telephone seul — un chauffeur qui change
 * d'appareil ne doit pas perdre ses contacts d'urgence. Quand l'API arrivera,
 * ce hook appellera `GET/POST /driver/me/emergency-contacts` (R12).
 */

import { useCallback, useEffect, useState } from 'react';

import {
  DEMO_DRIVER_EMERGENCY_CONTACTS,
  type DriverEmergencyContact,
} from '../../services/driverSafety';

/**
 * Liste partagee au niveau du module : le panneau d'urgence et l'ecran de
 * profil doivent voir les MEMES contacts. Un etat par composant afficherait
 * deux listes divergentes.
 *
 * NOTE : c'est un cache de reponse backend, pas de l'etat d'application au sens
 * de R6 — d'ou l'absence de contexte tant qu'un seul ecran l'ecrit.
 */
let contacts: DriverEmergencyContact[] = [...DEMO_DRIVER_EMERGENCY_CONTACTS];

/** Abonnes a prevenir quand la liste change, pour que les deux ecrans suivent. */
const listeners = new Set<(next: DriverEmergencyContact[]) => void>();

function publish(next: DriverEmergencyContact[]) {
  contacts = next;
  listeners.forEach((listener) => listener(next));
}

/** Lecture directe, pour les appelants hors composant (alerte d'urgence). */
export function getDriverEmergencyContacts(): DriverEmergencyContact[] {
  return contacts;
}

export type DriverContactDraft = {
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
export function validateDriverContact(draft: DriverContactDraft): string | null {
  if (draft.name.trim().length === 0) return 'Indiquez un nom.';

  // Numeros camerounais et services d'urgence courts (117, 118) : on verifie la
  // forme, pas l'existence — seul un envoi reel peut la confirmer.
  const digits = draft.phone.replace(/[\s.-]/g, '');
  if (!/^\+?\d{3,15}$/.test(digits)) {
    return 'Numéro invalide. Exemple : +237690000021';
  }

  return null;
}

export function useDriverEmergencyContacts() {
  const [items, setItems] = useState<DriverEmergencyContact[]>(contacts);

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

  const add = useCallback((draft: DriverContactDraft) => {
    const contact: DriverEmergencyContact = {
      id: `dc-${Date.now()}`,
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
