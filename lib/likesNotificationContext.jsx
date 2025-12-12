import { createContext, useContext, useState } from "react";

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

  return (
    <LikesNotificationContext.Provider
      value={{ newLikesCount, setNewLikesCount, clearNewLikes }}
    >
      {children}
    </LikesNotificationContext.Provider>
  );
}

export function useLikesNotification() {
  return useContext(LikesNotificationContext);
}

