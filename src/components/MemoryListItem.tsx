import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '../lib/colors';

interface MemoryListItemProps {
  category: string;
  title: string;
  preview: string;
  date: string;
  onPress?: () => void;
}

export function MemoryListItem({
  category,
  title,
  preview,
  date,
  onPress,
}: MemoryListItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-surface rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs text-muted">{category}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted">{date}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </View>
      </View>
      <Text className="text-base font-semibold text-foreground mb-1">{title}</Text>
      <Text className="text-sm text-foreground-secondary" numberOfLines={2}>
        {preview}
      </Text>
    </TouchableOpacity>
  );
}
