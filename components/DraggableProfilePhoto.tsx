import { View, Text, Pressable, Image, LayoutChangeEvent } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useEffect } from "react";

interface DraggableProfilePhotoProps {
  photo: string;
  index: number;
  isMainPhoto: boolean;
  isDragging: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onLongPress: () => void;
  onDragUpdate?: (targetIndex: number | null) => void;
  onDragEnd: (targetIndex: number | null) => void;
  onRemove: () => void;
  layoutPositions: { [key: number]: { x: number; y: number; width: number; height: number } };
  hoverTargetIndex: number | null;
  draggingIndex: number | null;
}

export default function DraggableProfilePhoto({
  photo,
  index,
  isMainPhoto,
  isDragging,
  onLayout,
  onLongPress,
  onDragUpdate,
  onDragEnd,
  onRemove,
  layoutPositions,
  hoverTargetIndex,
  draggingIndex,
}: DraggableProfilePhotoProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shiftX = useSharedValue(0);

  useEffect(() => {
    if (isDragging) {
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
    } else {
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const findTargetIndex = (x: number, y: number): number | null => {
    "worklet";
    let closestIndex: number | null = null;
    let closestDistance = Infinity;
    
    // Check all 6 slots
    for (let i = 0; i < 6; i++) {
      const pos = layoutPositions[i];
      if (pos) {
        const centerX = pos.x + pos.width / 2;
        const centerY = pos.y + pos.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        // Use a larger threshold for grid layout
        const threshold = Math.max(pos.width, pos.height) * 0.6;
        if (distance < threshold && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }
    }
    return closestIndex;
  };

  const panGesture = Gesture.Pan()
    .enabled(isDragging)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      
      // Find current hover target and notify parent
      const currentPos = layoutPositions[index];
      if (currentPos) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        const targetIndex = findTargetIndex(targetX, targetY);
        if (onDragUpdate) {
          runOnJS(onDragUpdate)(targetIndex);
        }
      }
    })
    .onEnd((e) => {
      const currentPos = layoutPositions[index];
      let targetIndex: number | null = null;
      
      if (currentPos) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        targetIndex = findTargetIndex(targetX, targetY);
      }
      
      runOnJS(onDragEnd)(targetIndex);
      
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      shiftX.value = withSpring(0);
    });

  // Calculate shift for non-dragging items (horizontal list)
  useEffect(() => {
    if (draggingIndex !== null && draggingIndex !== index && hoverTargetIndex !== null) {
      const currentPos = layoutPositions[index];
      if (!currentPos) {
        shiftX.value = withSpring(0);
        return;
      }

      // Determine which direction to shift (horizontal list)
      if (draggingIndex < hoverTargetIndex) {
        // Dragging forward: items between draggingIndex and hoverTargetIndex shift backward
        if (index > draggingIndex && index <= hoverTargetIndex) {
          // Shift to previous position
          const prevPos = layoutPositions[index - 1];
          if (prevPos) {
            shiftX.value = withSpring(prevPos.x - currentPos.x);
          } else {
            shiftX.value = withSpring(0);
          }
        } else {
          shiftX.value = withSpring(0);
        }
      } else if (draggingIndex > hoverTargetIndex) {
        // Dragging backward: items between hoverTargetIndex and draggingIndex shift forward
        if (index >= hoverTargetIndex && index < draggingIndex) {
          // Shift to next position
          const nextPos = layoutPositions[index + 1];
          if (nextPos) {
            shiftX.value = withSpring(nextPos.x - currentPos.x);
          } else {
            shiftX.value = withSpring(0);
          }
        } else {
          shiftX.value = withSpring(0);
        }
      } else {
        shiftX.value = withSpring(0);
      }
    } else {
      shiftX.value = withSpring(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTargetIndex, draggingIndex, index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value + shiftX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      zIndex: isDragging ? 1000 : 1,
    };
  });

  return (
    <View className="relative w-full" onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onLongPress={onLongPress}
            className="relative w-full aspect-square"
          >
            <Image
              source={{ uri: photo }}
              className="w-full h-full rounded-xl"
              resizeMode="cover"
            />
            {isMainPhoto && (
              <View className="absolute top-1 left-1 bg-pink-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">Main</Text>
              </View>
            )}
            {isDragging && (
              <View className="absolute inset-0 bg-pink-500/20 border-2 border-pink-500 rounded-xl" />
            )}
            <Pressable
              className="absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
              onPress={onRemove}
            >
              <Text className="text-white text-xs">×</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

