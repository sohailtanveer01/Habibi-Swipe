export default {
    expo: {
      name: "Habibi Swipe",
      slug: "habibi-swipe",
      plugins: ["expo-router"],
      ios: {
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
  