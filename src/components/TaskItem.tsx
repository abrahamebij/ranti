import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors } from '../lib/colors';

interface TaskItemProps {
  title: string;
  subtitle?: string;
  time?: string;
  completed?: boolean;
  onToggle?: () => void;
  showDivider?: boolean;
}

export function TaskItem({
  title,
  subtitle,
  time,
  completed = false,
  onToggle,
  showDivider = true,
}: TaskItemProps) {
  return (
    <>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center py-3 gap-3"
      >
        {/* Checkbox */}
        <View
          className={`w-6 h-6 rounded-full border-2 items-center justify-center flex-shrink-0 ${
            completed ? 'bg-primary border-primary' : 'border-border'
          }`}
        >
          {completed && (
            <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text
            className={`text-sm font-medium ${
              completed ? 'text-muted line-through' : 'text-foreground'
            }`}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>
          ) : null}
        </View>

        {/* Time */}
        {time ? (
          <Text className="text-xs text-muted flex-shrink-0">{time}</Text>
        ) : null}
      </TouchableOpacity>

      {showDivider && <View className="h-px bg-border" />}
    </>
  );
}
