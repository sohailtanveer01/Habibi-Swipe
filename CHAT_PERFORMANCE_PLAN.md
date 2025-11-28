# Chat Performance Optimization Plan

## Current Issues & Opportunities

### 1. **Message Loading & Rendering**
- **Current**: Loading all messages at once
- **Optimization**: Implement pagination (load messages in chunks)
- **Benefit**: Faster initial load, better memory usage

### 2. **Real-time Subscriptions**
- **Current**: Basic subscription setup
- **Optimization**: 
  - Optimize subscription filters
  - Handle connection states (online/offline)
  - Batch updates instead of individual message updates
- **Benefit**: More reliable, less overhead

### 3. **FlatList Performance**
- **Current**: Basic FlatList setup
- **Optimization**:
  - Add `getItemLayout` for fixed-height items
  - Enable `removeClippedSubviews`
  - Use `maxToRenderPerBatch` and `windowSize`
  - Implement `initialNumToRender`
- **Benefit**: Smoother scrolling, better memory management

### 4. **Image Loading**
- **Current**: Basic Image component
- **Optimization**:
  - Use `expo-image` for better caching
  - Implement image placeholders
  - Lazy load images
- **Benefit**: Faster image loading, better UX

### 5. **State Management**
- **Current**: Basic useState
- **Optimization**:
  - Memoize expensive computations (groupedMessages)
  - Use `useMemo` and `useCallback` appropriately
  - Optimize re-renders
- **Benefit**: Fewer unnecessary re-renders

### 6. **Message Deduplication**
- **Current**: Basic deduplication in render
- **Optimization**: 
  - Deduplicate at state level
  - Use Set/Map for O(1) lookups
- **Benefit**: Faster deduplication checks

### 7. **Scroll Performance**
- **Current**: Basic scroll handling
- **Optimization**:
  - Debounce scroll events
  - Implement scroll-to-bottom button when scrolled up
  - Optimize `onContentSizeChange`
- **Benefit**: Smoother scrolling experience

### 8. **Background/Foreground Handling**
- **Current**: No special handling
- **Optimization**:
  - Pause subscriptions when app is in background
  - Resume and sync when app comes to foreground
- **Benefit**: Better battery life, fewer unnecessary updates

### 9. **Message Pagination**
- **Current**: Load all messages
- **Optimization**:
  - Load last 50 messages initially
  - Load more on scroll to top
  - Show "Load older messages" button
- **Benefit**: Faster initial load, better for long conversations

### 10. **Edge Function Optimization**
- **Current**: Basic queries
- **Optimization**:
  - Add pagination support to `get-chat`
  - Return message count for pagination
  - Cache frequently accessed data
- **Benefit**: Faster API responses

## Implementation Priority

### Phase 1: Critical Performance (Do First)
1. ✅ Message deduplication (already done)
2. FlatList optimizations (`getItemLayout`, `removeClippedSubviews`)
3. Memoize `groupedMessages` computation
4. Optimize real-time subscription (prevent duplicate updates)

### Phase 2: User Experience (Do Second)
5. Message pagination (load in chunks)
6. Scroll-to-bottom button
7. Image optimization with `expo-image`
8. Typing indicators (optional)

### Phase 3: Advanced Optimizations (Do Third)
9. Background/foreground handling
10. Connection state management
11. Message caching
12. Optimistic updates

## Technical Implementation Details

### FlatList Optimizations
```javascript
<FlatList
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={20}
  windowSize={10}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // ... other props
/>
```

### Memoization Strategy
- Memoize `groupedMessages` with `useMemo`
- Memoize `cleanPhotoUrl` results
- Use `useCallback` for event handlers

### Pagination Strategy
- Initial load: Last 50 messages
- Load more: Previous 50 messages on scroll to top
- Store pagination state (hasMore, loadingMore)

### Real-time Optimization
- Batch message updates (collect multiple inserts, update once)
- Debounce subscription callbacks
- Handle connection state changes

## Expected Performance Improvements

- **Initial Load Time**: 50-70% faster (with pagination)
- **Scroll Performance**: 60-80% smoother (with FlatList optimizations)
- **Memory Usage**: 40-60% reduction (with pagination and virtualization)
- **Real-time Updates**: More reliable, less overhead
- **Battery Life**: Better (with background handling)

