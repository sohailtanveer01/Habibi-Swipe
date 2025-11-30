# Preferences/Filters Implementation Plan

## Overview
Implement a comprehensive preferences system that allows users to filter potential matches based on various criteria, including location-based filtering using PostGIS.

---

## 1. Database Schema

### Create `user_preferences` Table

```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Age Range
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 50,
  
  -- Location Filter
  location_enabled BOOLEAN DEFAULT false,
  search_radius_km INTEGER DEFAULT 50, -- Search radius in kilometers
  search_location GEOGRAPHY(POINT, 4326), -- User's search location (can differ from profile location)
  
  -- Gender Preference
  gender_preference TEXT[], -- Array of preferred genders: ['male', 'female', 'non-binary']
  
  -- Religious Filters
  sect_preferences TEXT[], -- Array: ['sunni', 'shia', 'sufi', 'other']
  religious_practice_preferences TEXT[], -- Array: ['actively practicing', 'moderately practicing', 'not practicing']
  born_muslim_preference TEXT, -- 'yes', 'no', 'both', null (no preference)
  
  -- Lifestyle Filters
  alcohol_preferences TEXT[], -- Array: ['drinks', 'doesn\'t drink', 'sometimes']
  smoking_preferences TEXT[], -- Array: ['smokes', 'doesn\'t smoke', 'sometimes']
  
  -- Background Filters
  nationality_preferences TEXT[], -- Array of preferred nationalities
  ethnicity_preferences TEXT[], -- Array of preferred ethnicities
  
  -- Personal Filters
  marital_status_preferences TEXT[], -- Array: ['single', 'divorced', 'widowed']
  has_children_preference TEXT, -- 'yes', 'no', 'both', null (no preference)
  
  -- Education & Profession
  education_preferences TEXT[], -- Array of preferred education levels
  profession_preferences TEXT[], -- Array of preferred professions
  
  -- Height Range (optional)
  height_min_cm INTEGER, -- Minimum height in cm
  height_max_cm INTEGER, -- Maximum height in cm
  
  -- Marriage Timeline Preference
  marriage_timeline_preferences TEXT[], -- Array of preferred timelines
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_location ON public.user_preferences USING GIST(search_location);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_updated_at();
```

---

## 2. Filter Categories & Options

### **Age Range**
- **Type**: Range slider (min/max)
- **Default**: 18-50
- **Range**: 18-100

### **Location Filter**
- **Type**: Toggle + Radius slider + Map picker
- **Default**: Disabled, 50km radius
- **Options**:
  - Enable/disable location filtering
  - Set search radius (5km, 10km, 25km, 50km, 100km, 250km, 500km, "Anywhere")
  - Pick search location (can be different from profile location)

### **Gender Preference**
- **Type**: Multi-select checkboxes
- **Options**: Male, Female, Non-binary
- **Default**: All selected

### **Religious Filters**

#### Sect Preference
- **Type**: Multi-select checkboxes
- **Options**: Sunni, Shia, Sufi, Other, Prefer not to say
- **Default**: All selected

#### Religious Practice Level
- **Type**: Multi-select checkboxes
- **Options**: 
  - Actively practicing
  - Moderately practicing
  - Not practicing
- **Default**: All selected

#### Born Muslim
- **Type**: Radio buttons
- **Options**: Yes, No, Both, No preference
- **Default**: No preference

### **Lifestyle Filters**

#### Alcohol Habit
- **Type**: Multi-select checkboxes
- **Options**: Drinks, Doesn't drink, Sometimes
- **Default**: All selected

#### Smoking Habit
- **Type**: Multi-select checkboxes
- **Options**: Smokes, Doesn't smoke, Sometimes
- **Default**: All selected

### **Background Filters**

#### Nationality
- **Type**: Multi-select searchable dropdown
- **Options**: All available nationalities (from user profiles)
- **Default**: All (empty array = no filter)

#### Ethnicity
- **Type**: Multi-select searchable dropdown
- **Options**: All available ethnicities (from user profiles)
- **Default**: All (empty array = no filter)

### **Personal Filters**

#### Marital Status
- **Type**: Multi-select checkboxes
- **Options**: Single, Divorced, Widowed
- **Default**: All selected

#### Has Children
- **Type**: Radio buttons
- **Options**: Yes, No, Both, No preference
- **Default**: No preference

### **Education & Profession**

#### Education Level
- **Type**: Multi-select checkboxes
- **Options**: All education levels from profiles
- **Default**: All selected

#### Profession
- **Type**: Multi-select searchable dropdown
- **Options**: All professions from profiles
- **Default**: All (empty array = no filter)

### **Height Range** (Optional)
- **Type**: Range slider (min/max in cm)
- **Default**: No filter (null values)
- **Range**: 100cm - 250cm

### **Marriage Timeline**
- **Type**: Multi-select checkboxes
- **Options**: All timeline options from onboarding
- **Default**: All selected

---

## 3. Implementation Steps

### Step 1: Database Migration
1. Create the `user_preferences` table with the SQL above
2. Run the migration in Supabase

### Step 2: Preferences UI Screen
Create `app/(main)/profile/preferences.tsx`:
- Tab or section in profile screen
- Form with all filter categories
- Save button to persist preferences
- "Reset to Defaults" button

### Step 3: Update Edge Function `get_swipe_feed`
Modify the function to:
1. Fetch user's preferences
2. Apply all filters when querying profiles:
   - Age calculation from DOB
   - Location distance using PostGIS `ST_DWithin`
   - Array filters for multi-select preferences
   - Boolean/null filters for single-select preferences
3. Return filtered results

### Step 4: Location Services
- Use device location or allow manual selection
- Store as PostGIS geography point
- Calculate distance using `ST_Distance` or `ST_DWithin`

---

## 4. Edge Function Filtering Logic

### SQL Query Structure

```sql
SELECT u.*
FROM users u
WHERE 
  -- Exclude current user
  u.id != $current_user_id
  
  -- Exclude already swiped users
  AND u.id NOT IN (
    SELECT swiped_id FROM swipes WHERE swiper_id = $current_user_id
  )
  
  -- Age filter (calculate age from DOB)
  AND EXTRACT(YEAR FROM AGE(u.dob)) BETWEEN $age_min AND $age_max
  
  -- Gender filter
  AND ($gender_preferences IS NULL OR u.gender = ANY($gender_preferences))
  
  -- Location filter (if enabled)
  AND (
    NOT $location_enabled 
    OR u.location IS NULL
    OR ST_DWithin(
      u.location::geography,
      $search_location::geography,
      $search_radius_km * 1000 -- Convert km to meters
    )
  )
  
  -- Sect filter
  AND ($sect_preferences IS NULL OR array_length($sect_preferences, 1) IS NULL OR u.sect = ANY($sect_preferences))
  
  -- Religious practice filter
  AND ($religious_practice_preferences IS NULL OR array_length($religious_practice_preferences, 1) IS NULL OR u.religious_practice = ANY($religious_practice_preferences))
  
  -- Born Muslim filter
  AND (
    $born_muslim_preference IS NULL 
    OR $born_muslim_preference = 'both'
    OR ($born_muslim_preference = 'yes' AND u.born_muslim = true)
    OR ($born_muslim_preference = 'no' AND u.born_muslim = false)
  )
  
  -- Alcohol filter
  AND ($alcohol_preferences IS NULL OR array_length($alcohol_preferences, 1) IS NULL OR u.alcohol_habit = ANY($alcohol_preferences))
  
  -- Smoking filter
  AND ($smoking_preferences IS NULL OR array_length($smoking_preferences, 1) IS NULL OR u.smoking_habit = ANY($smoking_preferences))
  
  -- Nationality filter
  AND ($nationality_preferences IS NULL OR array_length($nationality_preferences, 1) IS NULL OR u.nationality = ANY($nationality_preferences))
  
  -- Ethnicity filter
  AND ($ethnicity_preferences IS NULL OR array_length($ethnicity_preferences, 1) IS NULL OR u.ethnicity = ANY($ethnicity_preferences))
  
  -- Marital status filter
  AND ($marital_status_preferences IS NULL OR array_length($marital_status_preferences, 1) IS NULL OR u.marital_status = ANY($marital_status_preferences))
  
  -- Has children filter
  AND (
    $has_children_preference IS NULL 
    OR $has_children_preference = 'both'
    OR ($has_children_preference = 'yes' AND u.has_children = true)
    OR ($has_children_preference = 'no' AND u.has_children = false)
  )
  
  -- Education filter
  AND ($education_preferences IS NULL OR array_length($education_preferences, 1) IS NULL OR u.education = ANY($education_preferences))
  
  -- Profession filter (if implemented)
  AND ($profession_preferences IS NULL OR array_length($profession_preferences, 1) IS NULL OR u.profession = ANY($profession_preferences))
  
  -- Height filter (if specified)
  AND (
    $height_min_cm IS NULL 
    OR $height_max_cm IS NULL
    OR (CAST(u.height AS INTEGER) BETWEEN $height_min_cm AND $height_max_cm)
  )
  
  -- Marriage timeline filter
  AND ($marriage_timeline_preferences IS NULL OR array_length($marriage_timeline_preferences, 1) IS NULL OR u.marriage_timeline = ANY($marriage_timeline_preferences))
  
  -- Only show users with at least one photo
  AND u.photos IS NOT NULL 
  AND array_length(u.photos, 1) > 0
  
ORDER BY u.last_active_at DESC
LIMIT $limit;
```

---

## 5. UI/UX Considerations

### Preferences Screen Layout
1. **Collapsible Sections**: Group related filters
2. **Clear Visual Feedback**: Show active filter count
3. **Quick Actions**:
   - "Clear All" button
   - "Reset to Defaults" button
   - "Save" button (auto-save on change optional)

### Filter Display
- Show active filters as chips/badges
- Indicate when filters are reducing results
- Allow quick toggle on/off for each filter category

### Location Picker
- Map view to select search location
- Address search/autocomplete
- Current location button
- Radius visualization on map

---

## 6. Edge Cases & Defaults

### Default Preferences
- If user has no preferences set, use defaults:
  - Age: 18-50
  - All other filters: No restrictions (show everyone)
  - Location: Disabled

### Empty Results
- Show message: "No matches found. Try adjusting your filters."
- Suggest relaxing filters
- Show "Clear Filters" button

### Missing Data
- If a user hasn't filled a field, they won't be filtered out (unless explicitly required)
- Consider showing "Incomplete profiles" toggle

---

## 7. Performance Considerations

1. **Indexes**: Ensure proper indexes on filtered columns
2. **PostGIS**: Use spatial indexes for location queries
3. **Caching**: Cache user preferences in Edge Function
4. **Pagination**: Implement pagination for large result sets
5. **Query Optimization**: Use EXISTS instead of IN for large arrays when possible

---

## 8. Testing Checklist

- [ ] Create preferences for a user
- [ ] Test each filter individually
- [ ] Test multiple filters combined
- [ ] Test location filtering with different radii
- [ ] Test with no preferences (should show all)
- [ ] Test with very restrictive filters (should show few/none)
- [ ] Test edge cases (null values, empty arrays)
- [ ] Verify RLS policies work correctly
- [ ] Test performance with large user base

---

## 9. Future Enhancements

1. **Smart Filters**: AI-suggested filters based on user behavior
2. **Filter Presets**: Save multiple filter sets (e.g., "Local", "Long Distance", "Strict")
3. **Filter Analytics**: Show how many users match current filters
4. **Mutual Preferences**: Show if preferences align with potential match
5. **Filter Notifications**: Alert when new users match strict filters

