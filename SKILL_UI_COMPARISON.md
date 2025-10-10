# Skill Assignment UI - Before & After Comparison

## 1. Hero Screen - Skills Tab Assignment

### BEFORE:
```
┌─────────────────────────────────────────┐
│  Hero Screen - Skills Tab               │
├─────────────────────────────────────────┤
│                                         │
│  [Skill List]                           │
│  • Lightning Strike ⚡ [➕ Assign]      │
│  • Fire Ball 🔥 [➕ Assign]            │
│  • Ice Blast ❄️ [➕ Assign]            │
│                                         │
├─────────────────────────────────────────┤
│  Assign Lightning Strike ⚡ to slot:    │
│  [Q] [W] [E] [R] [❌ Cancel]           │
└─────────────────────────────────────────┘
```
**Issues:**
- Inline bar at bottom (not prominent)
- No indication of current bindings
- Takes up space in the UI
- Less intuitive

### AFTER:
```
┌─────────────────────────────────────────┐
│  Hero Screen - Skills Tab               │
├─────────────────────────────────────────┤
│                                         │
│  [Skill List]                           │
│  • Lightning Strike ⚡ [➕ Assign]      │
│  • Fire Ball 🔥 [➕ Assign]            │
│  • Ice Blast ❄️ [➕ Assign]            │
│                                         │
└─────────────────────────────────────────┘

        ┌───────────────────────────┐
        │ ⚡ MODAL OVERLAY ⚡        │
        ├───────────────────────────┤
        │ Assign Lightning Strike ⚡ │
        │ to slot:                  │
        │                           │
        │  ┌───┬───┬───┬───┐       │
        │  │ Q │ W │ E │ R │       │
        │  └───┴───┴───┴───┘       │
        │  (Fire) (Ice) (empty) (Wind) │
        │                           │
        │ Tip: press Q/W/E/R        │
        │                           │
        │      [Cancel]             │
        └───────────────────────────┘
```
**Improvements:**
- ✅ Modal overlay (more prominent)
- ✅ Shows current skill bindings
- ✅ Keyboard shortcuts visible
- ✅ Better visual hierarchy
- ✅ Consistent with preview modal

---

## 2. Book Tab - Skill Preview

### BEFORE:
```
┌─────────────────────────────────────────┐
│  Hero Screen - Book Tab                 │
├─────────────────────────────────────────┤
│  [Skill List]                           │
│  • Lightning Strike ⚡ [▶️ Preview]     │
│                                         │
└─────────────────────────────────────────┘
         ↓ Click Preview
        ┌───────────────────────────┐
        │ Assign "Lightning Strike" │
        │ to key:                   │
        │                           │
        │  ┌───┬───┬───┬───┐       │
        │  │ Q │ W │ E │ R │       │
        │  └───┴───┴───┴───┘       │
        │                           │
        │      [Cancel]             │
        └───────────────────────────┘
         ↓ Select Q
        ┌───────────────────────────┐
        │         3... 2... 1...    │
        │      🔥 Casted!           │
        └───────────────────────────┘
         ↓
    Skill permanently assigned to Q
```
**Issues:**
- Must choose key before preview
- Permanently assigns skill
- Changes loadout unintentionally
- Extra step before seeing preview

### AFTER:
```
┌─────────────────────────────────────────┐
│  Hero Screen - Book Tab                 │
├─────────────────────────────────────────┤
│  [Skill List]                           │
│  • Lightning Strike ⚡ [▶️ Preview]     │
│                                         │
└─────────────────────────────────────────┘
         ↓ Click Preview
        ┌───────────────────────────┐
        │         3... 2... 1...    │
        │      🔥 Casted!           │
        └───────────────────────────┘
         ↓
    Skill temporarily used for preview
    Original loadout unchanged
```
**Improvements:**
- ✅ No modal (instant preview)
- ✅ Auto-selects best key (least cooldown)
- ✅ Temporary assignment only
- ✅ Original loadout preserved
- ✅ Faster preview experience

---

## 3. Flow Comparison

### Assignment Flow (Skills Tab):

**BEFORE:**
1. Click "Assign" button
2. Inline bar appears at bottom
3. Click Q/W/E/R button
4. Skill assigned
5. Bar disappears

**AFTER:**
1. Click "Assign" button
2. Modal overlay appears (center screen)
3. See current bindings for each key
4. Press Q/W/E/R key OR click button
5. Skill assigned
6. Modal disappears

### Preview Flow (Book Tab):

**BEFORE:**
1. Click "Preview" button
2. Modal asks for key selection
3. Click Q/W/E/R button
4. Wait for countdown
5. Skill casts
6. **Skill permanently assigned**

**AFTER:**
1. Click "Preview" button
2. Wait for countdown (auto-selects key)
3. Skill casts
4. **Original loadout unchanged**

---

## 4. Technical Implementation

### Skills Tab Modal:
```javascript
// New modal function
async function showKeyAssignModal(skillId) {
  return new Promise((resolve) => {
    // Create modal overlay
    // Show skill info + Q/W/E/R grid
    // Show current bindings
    // Handle keyboard shortcuts
    // Return selected slot index
  });
}

// Updated assignment function
async function showAssignBar(skillId) {
  const slotIndex = await showKeyAssignModal(skillId);
  if (slotIndex !== null) {
    assignSkillTo(slotIndex, skillId);
  }
}
```

### Preview Auto-Selection:
```javascript
// New helper function
function findKeyWithLeastCooldown(skills) {
  const keys = ["Q", "W", "E", "R"];
  let bestKey = null;
  let minCooldown = Infinity;
  
  for (const key of keys) {
    const remaining = Math.max(0, skills.cooldowns[key] - now());
    if (remaining < minCooldown) {
      minCooldown = remaining;
      bestKey = key;
    }
  }
  return bestKey;
}

// Updated preview function
skills.previewSkill = function(def) {
  const key = findKeyWithLeastCooldown(skills);
  await showCastingOverlayAndCast(skills, def, key, false);
  // persist = false means temporary assignment
};
```

---

## 5. User Benefits

### For Assignment (Skills Tab):
- 🎯 **More Visible**: Modal is center-screen, can't miss it
- 📋 **More Informative**: See what's currently on each key
- ⌨️ **Faster**: Keyboard shortcuts clearly indicated
- 🎨 **Better UX**: Consistent with modern UI patterns

### For Preview (Book Tab):
- ⚡ **Faster**: No extra modal to dismiss
- 🎮 **Safer**: Won't accidentally change loadout
- 🤖 **Smarter**: Auto-selects best key
- 🔄 **Cleaner**: Original skills restored after preview

---

## 6. Edge Cases Handled

### Skills Tab:
- ✅ ESC key cancels modal
- ✅ Click outside modal (backdrop) - handled by cancel button
- ✅ Keyboard shortcuts work even when button not focused
- ✅ Shows "(empty)" for unassigned slots
- ✅ Proper cleanup of event listeners

### Preview:
- ✅ All keys on cooldown: selects one with least remaining time
- ✅ No keys available: falls back to original preview (visual only)
- ✅ Original skill restoration after preview
- ✅ Handles missing skill definitions gracefully
- ✅ Countdown adjusts based on cooldown remaining

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| **Assignment UI** | Inline bar | Modal overlay |
| **Current bindings** | Not shown | Shown for each key |
| **Keyboard shortcuts** | Available | Visible + available |
| **Preview key selection** | Manual (modal) | Automatic (smart) |
| **Preview persistence** | Permanent | Temporary |
| **Loadout safety** | Can change accidentally | Protected |
| **User steps** | More clicks | Fewer clicks |
| **Visual consistency** | Mixed | Unified |

**Result**: More intuitive, safer, and faster skill management! 🎉