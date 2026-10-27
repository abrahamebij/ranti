import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '../lib/colors';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value, onValueChange, disabled = false }: SwitchProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={`w-13 h-7 rounded-full p-0.5 justify-center ${
        value ? 'bg-primary items-end' : 'bg-surface-muted border border-border items-start'
      }`}
    >
      <View
        className={`w-6 h-6 rounded-full items-center justify-center ${
          value ? 'bg-surface' : 'bg-muted'
        }`}
      >
        {value && (
          <Ionicons name="checkmark" size={14} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
}
