import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <View
      className={`bg-surface rounded-2xl p-4 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
