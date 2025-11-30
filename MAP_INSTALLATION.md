# Map Library Installation

The location filter feature requires a map library. You have two options:

## Option 1: react-native-maps (Recommended)

```bash
npm install react-native-maps
```

For Expo projects, you may also need:
```bash
npx expo install react-native-maps
```

**Note**: For iOS, you may need to add Google Maps API key in `app.json`:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

## Option 2: expo-maps (If available)

If you prefer using Expo's built-in maps:
```bash
npx expo install expo-maps
```

Then update the import in `app/(main)/swipe/filters.tsx`:
```typescript
import MapView, { Circle, Marker } from 'expo-maps';
```

## After Installation

1. Restart your Expo development server
2. Rebuild the app if using a development build
3. The map should now display in the location filters screen

