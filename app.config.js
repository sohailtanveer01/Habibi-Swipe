export default {
    expo: {
      name: "Habibi Swipe",
      slug: "habibi-swipe",
      scheme: "habibiswipe",
      extra: {
        eas: {
          projectId: "5401771d-589a-47b5-8e0c-e0850eea1cc3",
        },
      },
      plugins: [
        "expo-router",
        [
          "@react-native-google-signin/google-signin",
          {
            iosUrlScheme: "com.googleusercontent.apps.32648878488-c1epo6b84ibikaknfnu800f103p3j3cu.apps.googleusercontent.com",
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
          NSMicrophoneUsageDescription:
            "Habibi Swipe needs access to your microphone to send voice messages.",
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
  