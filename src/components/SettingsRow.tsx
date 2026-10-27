import React, { type ComponentProps } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '../lib/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  showDivider = true,
}: SettingsRowProps) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        className="flex-row items-center py-4 gap-3"
      >
        <Ionicons name={icon} size={22} color={colors.foregroundSecondary} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
        {trailing ?? (
          onPress ? (
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          ) : null
        )}
      </TouchableOpacity>
      {showDivider && <View className="h-px bg-border" />}
    </>
  );
}
