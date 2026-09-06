import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import type { Place } from '../../services/geocoding';
import { usePlaceSearch } from './usePlaceSearch';
import { SearchField } from './components/SearchField';
import { PlaceRow } from './components/PlaceRow';
import { LandmarkField } from './components/LandmarkField';

/** Destination retenue par l'utilisateur, transmise a l'etape suivante. */
export type DestinationChoice = {
  place: Place;
  /** Precision libre saisie par l'utilisateur, chaine vide si aucune. */
  landmark: string;
};

type Props = {
  /** Position courante : fait remonter les resultats proches en premier. */
  origin: { longitude: number; latitude: number };
  onClose: () => void;
  onConfirm: (choice: DestinationChoice) => void;
  /** Pre-remplit le champ (appui sur un raccourci de l'accueil). */
  initialQuery?: string;
};

/**
 * Ecran de saisie de destination (R17 etape 3).
 *
 * Deroulement : l'utilisateur tape, la liste se met a jour, il choisit un
 * lieu ; l'ecran passe alors en mode confirmation ou il peut ajouter un point
 * de repere avant de valider.
 *
 * Il occupe tout l'ecran plutot qu'un sheet : la liste de suggestions a besoin
 * de la hauteur, et le clavier mangerait un sheet.
 */
export function DestinationSearchScreen({
  origin,
  onClose,
  onConfirm,
  initialQuery = '',
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Place | null>(null);
  const [landmark, setLandmark] = useState('');

  const search = usePlaceSearch(query, origin);

  // Choisir un lieu ne valide pas encore la course : on montre d'abord le
  // point de repere, qui n'a de sens qu'une fois la destination connue.
  const handleSelect = (place: Place) => setSelected(place);

  const handleBack = () => {
    if (selected) {
      setSelected(null); // retour a la liste avant de quitter l'ecran
      return;
    }
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Où allez-vous ?</Text>
        </View>

        {selected === null && (
          <SearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
          />
        )}
      </View>

      {/* La zone basse est reservee EN DEHORS de la liste : les suggestions y
          sont coupees au defilement au lieu de passer sous la barre de gestes. */}
      <SafeBottomArea>
        {selected === null ? (
          <ResultList state={search} query={query} onSelect={handleSelect} />
        ) : (
          <Confirmation
            place={selected}
            landmark={landmark}
            onLandmarkChange={setLandmark}
            onConfirm={() => onConfirm({ place: selected, landmark: landmark.trim() })}
          />
        )}
      </SafeBottomArea>
    </KeyboardAvoidingView>
  );
}

type ResultListProps = {
  state: ReturnType<typeof usePlaceSearch>;
  query: string;
  onSelect: (place: Place) => void;
};

/** Liste des suggestions et ses etats degrades (R8). */
function ResultList({ state, query, onSelect }: ResultListProps) {
  if (state.error) {
    return <Message icon="cloud-offline" title={state.error} />;
  }

  if (state.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.isEmpty) {
    return (
      <Message
        icon="search"
        title="Aucun lieu trouvé"
        detail="Essayez un quartier ou un point de repère connu."
      />
    );
  }

  if (query.trim().length === 0) {
    return (
      <Message
        icon="navigate"
        title="Saisissez votre destination"
        detail="Une adresse, un quartier ou un point de repère."
      />
    );
  }

  return (
    <FlatList
      data={state.results}
      keyExtractor={(place) => place.id}
      renderItem={({ item }) => <PlaceRow place={item} onPress={onSelect} />}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
    />
  );
}

type ConfirmationProps = {
  place: Place;
  landmark: string;
  onLandmarkChange: (value: string) => void;
  onConfirm: () => void;
};

/** Destination retenue : recapitulatif, point de repere, validation. */
function Confirmation({
  place,
  landmark,
  onLandmarkChange,
  onConfirm,
}: ConfirmationProps) {
  return (
    <View style={styles.confirm}>
      <View style={styles.selected}>
        <Ionicons name="location" size={20} color={colors.primary} />
        <View style={styles.selectedText}>
          <Text style={styles.selectedLabel}>{place.label}</Text>
          <Text style={styles.selectedContext}>{place.context}</Text>
        </View>
      </View>

      <LandmarkField value={landmark} onChangeText={onLandmarkChange} />

      <View style={styles.spacer} />

      <Pressable
        style={styles.confirmButton}
        onPress={onConfirm}
        accessibilityRole="button"
        accessibilityLabel="Valider cette destination"
      >
        <Text style={styles.confirmLabel}>Valider la destination</Text>
      </Pressable>
    </View>
  );
}

function Message({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
}) {
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={28} color={colors.textFaint} />
      <Text style={styles.messageTitle}>{title}</Text>
      {detail && <Text style={styles.messageDetail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: typography.title,
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  messageTitle: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  messageDetail: {
    ...typography.label,
    textAlign: 'center',
  },
  confirm: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedText: {
    flex: 1,
    gap: 2,
  },
  selectedLabel: typography.subtitle,
  selectedContext: typography.label,
  spacer: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
});
