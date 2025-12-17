import { createContext, useContext, useState, useMemo } from "react";

const LikesNotificationContext = createContext({
  newLikesCount: 0,
  setNewLikesCount: () => {},
  clearNewLikes: () => {},
});

export function LikesNotificationProvider({ children }) {
  const [newLikesCount, setNewLikesCount] = useState(0);

  const clearNewLikes = () => {
    setNewLikesCount(0);
  };

  // Memoize the context value to ensure stable reference
  const value = useMemo(
    () => ({ newLikesCount, setNewLikesCount, clearNewLikes }),
    [newLikesCount]
  );

  return (
    <LikesNotificationContext.Provider value={value}>
      {children}
    </LikesNotificationContext.Provider>
  );
}

export function useLikesNotification() {
  return useContext(LikesNotificationContext);
}

