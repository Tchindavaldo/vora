import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas } from "../map/MapCanvas";
import { colors, shadows, SHEET_HEIGHT, spacing } from "../../theme";
import { DEFAULT_REGION } from "../../config/env";

import type { RoadPoint } from "../../services/roads";
import {
  fetchRoadPointsFromMap,
  type RoadQueryTarget,
} from "../../services/roadsFromMap";
import { useUserLocation } from "./useUserLocation";
import { useVehicleMotion } from "./useVehicleMotion";
import { HomeHeader } from "./components/HomeHeader";
import { HomeSheets } from "./components/HomeSheets";
import type { Shortcut } from "./components/DestinationSheet";
import {
  DestinationSearchScreen,
  type DestinationChoice,
} from "../search/DestinationSearchScreen";
import { useBookingFlow } from "../booking/useBookingFlow";
import { usePayment } from "../payment/usePayment";
import { useRideRequest } from "../ride/useRideRequest";
import { useRideOrder } from "./useRideOrder";
import { useHomeNavigation } from "./useHomeNavigation";
import { useRideRating } from "../ride/useRideRating";
import { RatingCommentScreen } from "../ride/components/RatingCommentScreen";
import { useDriverApproach } from "../ride/useDriverApproach";
import { useApproachRoute } from "../ride/useApproachRoute";
import { useRideCamera } from "../ride/useRideCamera";
import { useRideSafety } from "../ride/useRideSafety";
import { TransactionHistoryScreen } from "../history/TransactionHistoryScreen";
import { ProfileScreen } from "../profile/ProfileScreen";
import { EmergencyContactsScreen } from "../profile/EmergencyContactsScreen";
import { useEmergencyContacts } from "../profile/useEmergencyContacts";
import { LocationNotice } from "./components/LocationNotice";
import { useHomeMarkers } from "./useHomeMarkers";
import {
  DEMO_USER_INITIAL,
  DEMO_USER_NAME,
  NEARBY_VEHICLES,
  SHORTCUTS,
} from "./demoData";

/**
 * Deplacement automatique des vehicules alentour sur la carte.
 *
 * A `false` : les vehicules restent affiches, poses sur leur voie, mais
 * immobiles. Le seul vehicule qui bouge est alors celui du chauffeur affecte
 * a la course, dont le mouvement porte une information (il vient vous
 * chercher) au lieu d'etre decoratif.
 *
 * Repasser a `true` remet le trafic d'ambiance en mouvement.
 */
const AMBIENT_VEHICLES_MOVE = false;

/**
 * Ecran d'accueil passager.
 *
 * Parti pris de mise en page : la carte occupe TOUTE la hauteur et passe sous
 * le header comme sous le bottom sheet. Aucune bande blanche, aucune carte
 * encadree — c'est ce qui separe une app de mobilite credible d'une maquette.
 */
type Props = {
  /** Bascule vers l'ecran chauffeur, pour la demonstration (R17 etape 9). */
  onSwitchToDriver: () => void;
};

export function HomeScreen({ onSwitchToDriver }: Props) {
  const location = useUserLocation();
  const insets = useSafeAreaInsets();

  // Seule une position reelle autorise les commandes de course : ailleurs,
  // `coords` est le repli sur la ville par defaut.
  const hasPosition = location.status === "granted";

  // Positions posees sur de vraies rues, recuperees une fois la geolocalisation
  // resolue.
  //
  // `null` = on ne sait pas encore. On n'affiche AUCUN vehicule dans cet etat :
  // montrer les offsets de demonstration puis les deplacer quand Overpass
  // repond produirait un saut visible a l'ecran. Une fois la reponse connue —
  // vraies rues, ou tableau vide en cas d'echec (R8) — les vehicules
  // apparaissent a leur place definitive et n'en bougent plus.
  const [roadPoints, setRoadPoints] = useState<RoadPoint[] | null>(null);

  // Meme information que `roadPoints`, lisible sans attendre un nouveau rendu :
  // la carte peut signaler deux fins de rendu avant que l'etat ne soit a jour.
  const roadPointsRef = useRef<RoadPoint[] | null>(null);

  // On depend des COORDONNEES, pas de l'objet `location.coords` : celui-ci est
  // recree a chaque rendu, et la carte en declenche beaucoup (le suivi du cap
  // en produit un par image pendant une rotation).
  const { longitude, latitude } = location.coords;

  /**
   * Les routes viennent de la carte elle-meme, une fois ses tuiles dessinees.
   *
   * On n'interroge PAS de service exterieur (Overpass) : il est injoignable
   * depuis certains reseaux, et la carte a de toute facon deja telecharge la
   * geometrie des routes pour les afficher. Les vehicules tombent ainsi
   * exactement sur le trace visible, et non a cote.
   *
   * `useCallback` car la valeur est passee en prop a la carte : sans elle, une
   * nouvelle fonction a chaque rendu.
   */
  const handleRoadsAvailable = useCallback(
    (map: RoadQueryTarget) => {
      // Une seule fois : la carte signale chaque fin de rendu, et refaire le
      // placement a chaque geste ferait sauter les vehicules d'une rue a
      // l'autre sous les yeux de l'utilisateur.
      if (roadPointsRef.current) return;

      // Sans position reelle, la carte montre la ville par defaut : y faire
      // circuler des vehicules laisserait croire a des chauffeurs autour de
      // l'utilisateur, alors qu'on ignore ou il est (R13).
      if (!hasPosition) return;

      fetchRoadPointsFromMap(
        map,
        { longitude, latitude },
        NEARBY_VEHICLES.length,
      ).then((points) => {
        if (points.length === 0) return;
        roadPointsRef.current = points;
        setRoadPoints(points);
      });
    },
    [longitude, latitude, hasPosition],
  );

  // Les vehicules roulent le long de leur rue. Tant que les positions ne sont
  // pas connues, le hook ne renvoie rien et la carte reste sans vehicule.
  // Sans geoloc, on ne lui passe rien : l'animation s'arrete.
  //
  // DESACTIVE : passer `AMBIENT_VEHICLES_MOVE` a `true` remet les vehicules en
  // mouvement. Ils restent affiches, poses sur leur voie, simplement immobiles.
  const motions = useVehicleMotion(
    AMBIENT_VEHICLES_MOVE && hasPosition ? roadPoints : null,
  );

  // Course en preparation : destination, itineraire et tarifs (R17 etapes 4-5).
  const booking = useBookingFlow(location.coords);

  // Course commandee : creation, chauffeur, suivi (R17 etapes 6-8).
  const ride = useRideRequest();

  // Mode de paiement, choisi entre l'estimation et la recherche de chauffeur.
  const payment = usePayment();

  // Partage, SOS, assistance et signalement (R10). La position courante part
  // avec l'alerte : sans elle, prevenir un proche ne sert pas a grand-chose.
  const safety = useRideSafety(ride.ride, location.coords);

  // Contacts prevenus par l'alerte, definis dans le profil.
  const emergencyContacts = useEmergencyContacts();

  // Estimation -> paiement -> commande. Sorti de l'ecran pour le garder
  // lisible (R4) : voir `useRideOrder`.
  const order = useRideOrder({
    origin: location.coords,
    booking,
    payment,
    ride,
  });

  // Note et commentaire laisses au chauffeur, derniere etape du parcours.
  const rating = useRideRating();

  // Vrai itineraire du chauffeur vers le passager : le vehicule doit rouler sur
  // la chaussee, pas couper a vol d'oiseau.
  const approach = useApproachRoute(ride.ride);

  // Position animee du chauffeur, sur le trace d'approche puis sur celui de la
  // course.
  const driverPosition = useDriverApproach(
    ride.ride,
    approach.points,
    booking.routePoints,
  );

  // Composition de la carte : vehicules alentour, position, destination,
  // chauffeur. Sortie de l'ecran pour qu'il reste lisible (R4).
  const markers = useHomeMarkers({
    coords: location.coords,
    isFallbackLocation: location.isFallback,
    roadPoints: hasPosition ? roadPoints : null,
    motions,
    destination:
      booking.choice === null
        ? null
        : {
            longitude: booking.choice.place.longitude,
            latitude: booking.choice.place.latitude,
          },
    driverPosition,
    driverKind: ride.ride?.tier ?? "eco",
  });

  const rideStatus = ride.ride?.status ?? null;

  // Cadrages de la carte pendant le suivi : recadrages automatiques aux
  // changements de statut, et retour a la vue d'ensemble a la demande.
  const camera = useRideCamera(
    rideStatus,
    approach.points,
    booking.routePoints,
  );

  // Incremente a chaque appui sur "recentrer" : voir `recenterToken` dans
  // MapCanvas.
  const [recenterToken, setRecenterToken] = useState(0);

  const handleRecenter = () => setRecenterToken((token) => token + 1);

  /**
   * Reprise apres une geoloc reactivee depuis les Reglages.
   *
   * La camera n'est posee qu'a l'initialisation et sur `recenterToken` : sans
   * ce coup de pouce, elle resterait sur la ville par defaut alors que la vraie
   * position est connue. On oublie aussi le placement des vehicules, calcule
   * autour du mauvais centre — le vol de camera declenche un nouveau rendu
   * complet, qui rappelle `handleRoadsAvailable` et les repose au bon endroit.
   */
  useEffect(() => {
    if (!hasPosition) return;

    roadPointsRef.current = null;
    setRoadPoints(null);
    setRecenterToken((token) => token + 1);
  }, [hasPosition]);

  /**
   * Ecrans pleins superposes a l'accueil : recherche, historique, profil,
   * contacts d'urgence. Voir `useHomeNavigation` — pas de librairie de
   * navigation (R18).
   */
  const nav = useHomeNavigation();

  const handleShortcutPress = (shortcut: Shortcut) => {
    // Le libelle du raccourci sert d'amorce de recherche. Quand le profil
    // utilisateur existera, un raccourci portera son adresse enregistree et
    // ouvrira directement l'estimation.
    nav.openSearch(shortcut.label);
  };

  const handleDestinationConfirm = (choice: DestinationChoice) => {
    nav.close();
    booking.start(choice);
  };

  /** Annule la course et revient a l'estimation, itineraire conserve. */
  const handleCancelRide = () => ride.cancel();

  /**
   * "Terminer" sur le suivi : on ouvre l'evaluation du chauffeur plutot que de
   * revenir a l'accueil. La course reste en memoire tant que le passager note —
   * le panneau a besoin du chauffeur et du montant.
   */
  const [isRating, setIsRating] = useState(false);

  /**
   * Commentaire ouvert : deuxieme temps de l'evaluation, en plein ecran.
   *
   * Il ne peut pas vivre dans le bottom sheet : celui-ci a une hauteur fixe et
   * le clavier le recouvre des que le champ prend le focus.
   */
  const [isCommenting, setIsCommenting] = useState(false);

  const handleRideDone = () => setIsRating(true);

  /**
   * Evaluation envoyee ou passee : la course rejoint l'historique avec la note
   * eventuelle, puis on efface tout et on revient a l'accueil.
   */
  const handleRatingClose = () => {
    setIsRating(false);
    setIsCommenting(false);
    order.reset(rating.stars);
    rating.reset();
  };

  // Commentaire : plein ecran pour que le clavier ne recouvre pas la saisie.
  const rated = ride.ride;
  if (isCommenting && rating.stars !== null && rated?.driver != null) {
    return (
      <RatingCommentScreen
        driver={rated.driver}
        stars={rating.stars}
        comment={rating.comment}
        onChangeComment={rating.setComment}
        isSending={rating.isSending}
        error={rating.error}
        onSubmit={async () => {
          // On ne quitte la saisie que si l'envoi a abouti : en cas d'echec, le
          // passager reste sur son texte avec le message d'erreur (R8).
          if (await rating.submit(rated)) setIsCommenting(false);
        }}
        onBack={() => setIsCommenting(false)}
      />
    );
  }

  if (nav.route?.name === "contacts") {
    return <EmergencyContactsScreen onClose={nav.openProfile} />;
  }

  if (nav.route?.name === "profile") {
    return (
      <ProfileScreen
        userName={DEMO_USER_NAME}
        userInitial={DEMO_USER_INITIAL}
        onOpenEmergencyContacts={nav.openContacts}
        onOpenHistory={nav.openHistory}
        onClose={nav.close}
        onSwitchToDriver={onSwitchToDriver}
      />
    );
  }

  if (nav.route?.name === "history") {
    return <TransactionHistoryScreen onClose={nav.close} />;
  }

  if (nav.route?.name === "search") {
    return (
      <DestinationSearchScreen
        origin={location.coords}
        initialQuery={nav.route.query}
        onClose={nav.close}
        onConfirm={handleDestinationConfirm}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <MapCanvas
        center={location.coords}
        zoom={DEFAULT_REGION.zoom}
        markers={markers}
        onRoadsAvailable={handleRoadsAvailable}
        recenterToken={recenterToken}
        // Le sheet masque le bas de l'ecran : la carte reste plein ecran et
        // passe dessous, mais son centre optique remonte au milieu de la zone
        // visible pour que la position de l'utilisateur y soit centree.
        bottomPadding={SHEET_HEIGHT + insets.bottom}
        route={booking.routePoints}
        fitRouteToken={booking.fitRouteToken}
        // Le trajet d'approche n'est trace que pendant qu'il sert : une fois le
        // passager a bord, il n'a plus rien a dire et encombrerait la carte.
        approach={rideStatus === "accepted" ? approach.points : undefined}
        fitPoints={camera.fitPoints}
        fitPointsToken={camera.fitPointsToken}
        fitPointsPadding={camera.fitPointsPadding}
      />

      <HomeHeader
        nearbyCount={NEARBY_VEHICLES.length}
        locationStatus={location.status}
        userInitial={DEMO_USER_INITIAL}
        onMenuPress={nav.openHistory}
        onProfilePress={nav.openProfile}
      />

      <View style={styles.bottomStack} pointerEvents="box-none">
        <LocationNotice
          status={location.status}
          cityLabel={DEFAULT_REGION.cityLabel}
        />

        {/*
          Sans position, recentrer et commander n'ont plus de sens : le
          recentrage viserait la ville par defaut et une commande partirait
          d'un depart faux. On ne laisse que le bandeau qui explique quoi
          faire, plutot que des commandes qui echoueraient (R8).
        */}
        {hasPosition && (
          <>
            <View style={styles.recenterRow} pointerEvents="box-none">
              {/*
            Cadrage sur l'itineraire en cours, a cote du recentrage : les deux
            repondent a la meme envie — "remets la carte comme il faut" — l'un
            sur soi, l'autre sur le trajet. Il n'apparait que s'il y a un trajet
            a cadrer.
          */}
              {camera.activeRoutePoints.length >= 2 && (
                <Pressable
                  style={styles.recenterButton}
                  onPress={camera.fitActiveRoute}
                  accessibilityRole="button"
                  accessibilityLabel="Afficher tout l’itinéraire"
                >
                  <Ionicons name="git-branch" size={20} color={colors.text} />
                </Pressable>
              )}

              <Pressable
                style={styles.recenterButton}
                onPress={handleRecenter}
                accessibilityRole="button"
                accessibilityLabel="Recentrer sur ma position"
              >
                <Ionicons name="locate" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Quel panneau s'affiche selon l'avancement : voir `HomeSheets`. */}
            <HomeSheets
              booking={booking}
              payment={payment}
              ride={ride}
              order={order}
              rating={rating}
              safety={safety}
              emergencyContacts={emergencyContacts.items}
              shortcuts={SHORTCUTS}
              isRating={isRating}
              onSearchPress={() => nav.openSearch()}
              onShortcutPress={handleShortcutPress}
              onCancelRide={handleCancelRide}
              onRideDone={handleRideDone}
              onOpenComment={() => setIsCommenting(true)}
              onRatingClose={handleRatingClose}
            />
          </>
        )}
      </View>
    </View>
  );
}

const RECENTER = 46;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mapFallback,
  },
  // Empile bandeau + bouton recentrer + sheet, ancres en bas de l'ecran.
  bottomStack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
  },
  // Les boutons de cadrage, alignes a droite : itineraire puis position.
  recenterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  recenterButton: {
    width: RECENTER,
    height: RECENTER,
    borderRadius: RECENTER / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
});
