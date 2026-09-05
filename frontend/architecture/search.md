# Feature — Recherche de destination (`src/features/search/`)

Étape 3 de l'ordre de construction (R17). Reçoit l'utilisateur depuis le champ
de recherche ou un raccourci du sheet d'accueil, et rend une destination
géocodée assortie d'un point de repère facultatif.

## Composition

```text
DestinationSearchScreen
├── SearchField          vrai TextInput, focus au montage
├── ResultList           suggestions + états vide / chargement / erreur
│   └── PlaceRow         un résultat : nom + contexte
└── Confirmation         lieu retenu
    ├── LandmarkField    point de repère libre (R11)
    └── bouton « Valider la destination »
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `DestinationSearchScreen.tsx` | Écran plein, bascule liste ↔ confirmation |
| `usePlaceSearch.ts` | Debounce, annulation, traduction des pannes en message |
| `components/SearchField.tsx` | Champ de saisie avec effacement |
| `components/PlaceRow.tsx` | Ligne de résultat |
| `components/LandmarkField.tsx` | Point de repère libre |
| `../../services/geocoding.ts` | Appel MapTiler Geocoding — seul fichier qui connaît le fournisseur (R11) |

## Flux

1. `HomeScreen` passe `searchQuery` de `null` à une chaîne : l'écran remplace
   l'accueil. Pas de librairie de navigation tant que l'app n'a que deux écrans
   (R18) ; elle viendra quand l'authentification ajoutera ses écrans.
2. Un raccourci (« Marché », « Aéroport ») pré-remplit la saisie. Quand le
   profil existera, il portera une adresse enregistrée et sautera cette étape.
3. La frappe déclenche `usePlaceSearch` : 350 ms de debounce, minimum
   3 caractères, requête précédente annulée. Le réseau camerounais est lent et
   facturé — une requête par caractère coûterait à l'utilisateur.
4. `searchPlaces` interroge MapTiler avec `proximity` (position courante) et
   `country=cm` : les résultats proches remontent, les homonymes étrangers
   sortent.
5. Choisir un résultat n'ouvre pas l'estimation : l'écran passe en confirmation,
   où le point de repère a du sens une fois la destination connue.
6. `onConfirm` renvoie `{ place, landmark }` à `HomeScreen`. Le calcul
   d'itinéraire (étape 4) reste un `TODO`.

## Ancrage local (brief §11, R11)

**Le point de repère est un champ à part entière, pas une note.** La couverture
OSM des rues secondaires de Douala est faible et beaucoup de destinations n'ont
pas d'adresse : on se situe par « en face de la pharmacie », « carrefour
Ndokoti ». Imposer une adresse exacte bloquerait l'utilisateur ; le champ libre
laisse passer l'information au chauffeur.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Clé de géocodage absente | Message explicite, aucune requête émise |
| Pas de connexion | « Pas de connexion. Vérifiez votre réseau et réessayez. » |
| Réseau trop lent (> 8 s) | Requête abandonnée, message de délai dépassé |
| Réponse invalide du fournisseur | « Service de recherche momentanément indisponible » |
| Aucun résultat | Invitation à essayer un quartier ou un point de repère |

Chaque échec produit aussi un `console.warn` exploitable.

## Reste à faire

- Historique des destinations récentes (cache local, utile hors ligne)
- Choix du point de départ (aujourd'hui la position courante uniquement)
- Sélection sur la carte pour une destination non géocodable
