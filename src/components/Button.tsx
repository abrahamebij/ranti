import React, { type ComponentProps } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors } from '../lib/colors';

type Variant = 'primary' | 'outline' | 'ghost';
type IconName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: Variant;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

const variantStyles: Record<Variant, { container: string; text: string; iconColor: string }> = {
  primary: {
    container: 'bg-primary',
    text: 'text-primary-foreground font-semibold text-base',
    iconColor: colors.primaryForeground,
  },
  outline: {
    container: 'bg-surface border border-border',
    text: 'text-primary font-medium text-base',
    iconColor: colors.primary,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary font-medium text-base',
    iconColor: colors.primary,
  },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onPress,
  ...rest
}: ButtonProps) {
  const s = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center py-4 px-6 rounded-full ${s.container} ${disabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={s.iconColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={20} color={s.iconColor} />
          )}
          <Text className={s.text}>{label}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={20} color={s.iconColor} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
