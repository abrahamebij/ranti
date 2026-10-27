import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { colors } from '../../lib/colors';

const TASKS = [
  { id: '1', title: 'Pick up the parcel', time: '5:30 PM' },
  { id: '2', title: 'Lunch with Maya', subtitle: '12:30 PM · Olive Café', time: 'Tomorrow' },
];

const MEMORIES = [
  {
    id: '1',
    category: 'Plans',
    title: 'Lunch with Maya',
    preview: 'Olive Café tomorrow. Bring her book.',
    date: 'Yesterday',
    hasChevron: true,
  },
  {
    id: '2',
    category: '',
    title: "Maya's coffee order",
    preview: 'Oat flat white, no sugar.',
    date: '',
    hasChevron: true,
    hasBookmark: true,
  },
];

export default function TodayScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-3xl font-bold text-foreground">Morning, Alex</Text>
          <Text className="text-sm text-foreground-secondary mt-1">Tuesday, October 27</Text>
        </View>

        {/* Up Next card */}
        <View className="mx-5 mb-6 bg-surface-muted rounded-2xl p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-muted tracking-widest mb-1">
                UP NEXT · 10:00 AM
              </Text>
              <Text className="text-xl font-bold text-foreground mb-1">Call the dentist</Text>
              <Text className="text-sm text-foreground-secondary">Book your next checkup.</Text>
            </View>
            <Ionicons name="notifications-outline" size={20} color={colors.foregroundSecondary} />
          </View>
        </View>

        {/* On your list */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">On your list</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm text-muted">View all</Text>
            </TouchableOpacity>
          </View>

          {TASKS.map((task, i) => (
            <View key={task.id}>
              <View className="flex-row items-center py-3 gap-3">
                <View className="w-6 h-6 rounded-full border-2 border-border" />
                <View className="flex-1">
                  <Text className="text-sm text-foreground">{task.title}</Text>
                  {task.subtitle ? (
                    <Text className="text-xs text-muted mt-0.5">{task.subtitle}</Text>
                  ) : null}
                </View>
                <Text className="text-xs text-muted">{task.time}</Text>
              </View>
              {i < TASKS.length - 1 && <View className="h-px bg-border" />}
            </View>
          ))}
        </View>

        {/* Fresh in your memory */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">Fresh in your memory</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-sm text-muted">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Plans memory card */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-surface rounded-2xl p-4 mb-2"
            onPress={() => router.push('/(tabs)/memories/1' as never)}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-muted">Plans</Text>
              <Text className="text-xs text-muted">Yesterday</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Lunch with Maya</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
            <Text className="text-sm text-foreground-secondary mt-1">
              Olive Café tomorrow. Bring her book.
            </Text>
          </TouchableOpacity>

          {/* Simple memory row */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center py-3 gap-3"
          >
            <Ionicons name="bookmark-outline" size={18} color={colors.muted} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">Maya's coffee order</Text>
              <Text className="text-xs text-muted">Oat flat white, no sugar.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Background listening banner */}
        <View className="mx-5 bg-surface-muted rounded-xl px-4 py-3 flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-active-dot" />
          <Text className="text-sm font-semibold text-primary">Background listening on</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
