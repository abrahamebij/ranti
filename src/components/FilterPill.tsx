import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface FilterPillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function FilterPill({ label, active = false, onPress }: FilterPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`px-4 py-2 rounded-full border ${
        active
          ? 'bg-primary border-primary'
          : 'bg-surface border-border'
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          active ? 'text-primary-foreground' : 'text-foreground-secondary'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
