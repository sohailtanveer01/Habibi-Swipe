export default {
    expo: {
      name: "Habibi Swipe",
      slug: "habibi-swipe",
      scheme: "habibiswipe",
      plugins: [
        "expo-router",
        [
          "@react-native-google-signin/google-signin",
          {
            iosUrlScheme: "com.googleusercontent.apps.6761114646-9ajjmjpnv04elnb0hhokmb2hc00mrnef",
          },
        ],
      ],
      ios: {
        bundleIdentifier: "com.habibiswipe.app",
        usesIcloudStorage: true,
        infoPlist: {
          NSPhotoLibraryUsageDescription:
            "Habibi Swipe needs access to your gallery to upload profile photos.",
          NSCameraUsageDescription:
            "Habibi Swipe needs access to your camera to take profile photos.",
        },
      },
      android: {
        permissions: [
          "READ_EXTERNAL_STORAGE",
          "WRITE_EXTERNAL_STORAGE",
          "CAMERA",
        ],
      },
    },
  };
  