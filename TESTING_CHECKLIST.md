# Testing Checklist - Skill Assignment UI Update

## Test Environment
- [ ] Server running on http://localhost:8000
- [ ] Browser console open (F12) to check for errors
- [ ] Test on desktop browser first
- [ ] Test on mobile/tablet if available

---

## 1. Skills Tab - Assignment Modal

### Basic Functionality
- [ ] Open Hero Screen (H key or button)
- [ ] Navigate to Skills tab
- [ ] Click "Assign" button (➕) on any unlocked skill
- [ ] Verify modal appears in center of screen
- [ ] Verify modal shows skill name and icon
- [ ] Verify modal shows Q/W/E/R buttons in grid
- [ ] Verify current skill names shown below each button

### Modal Interaction
- [ ] Click Q button - verify skill assigned to Q slot
- [ ] Click W button - verify skill assigned to W slot
- [ ] Click E button - verify skill assigned to E slot
- [ ] Click R button - verify skill assigned to R slot
- [ ] Verify modal closes after selection
- [ ] Verify slot display updates immediately

### Keyboard Shortcuts
- [ ] Open modal, press Q key - verify skill assigned
- [ ] Open modal, press W key - verify skill assigned
- [ ] Open modal, press E key - verify skill assigned
- [ ] Open modal, press R key - verify skill assigned
- [ ] Open modal, press ESC key - verify modal closes without assignment

### Cancel Functionality
- [ ] Open modal, click Cancel button
- [ ] Verify modal closes
- [ ] Verify no skill assignment occurred
- [ ] Verify no errors in console

### Visual Feedback
- [ ] Hover over Q/W/E/R buttons - verify background changes
- [ ] Hover over Cancel button - verify background changes
- [ ] Verify backdrop blur effect
- [ ] Verify modal shadow/border visible
- [ ] Verify text is readable

### Edge Cases
- [ ] Try assigning locked skill - verify button disabled
- [ ] Assign skill to slot that already has a skill - verify replacement works
- [ ] Rapidly click assign button - verify no duplicate modals
- [ ] Open modal, switch browser tab, return - verify modal still works
- [ ] Assign all 4 slots with different skills - verify all work

---

## 2. Book Tab - Preview Functionality

### Basic Preview
- [ ] Open Hero Screen (H key or button)
- [ ] Navigate to Book tab
- [ ] Click "Preview" button (▶️) on any skill
- [ ] Verify NO modal appears asking for key selection
- [ ] Verify Hero Screen fades out
- [ ] Verify countdown appears (numbers getting smaller)
- [ ] Verify skill casts (visual effect appears)
- [ ] Verify "🔥 Casted!" message appears
- [ ] Verify Hero Screen fades back in

### Loadout Preservation
- [ ] Note current loadout (Q/W/E/R skills)
- [ ] Preview a skill that's NOT in loadout
- [ ] After preview completes, check loadout
- [ ] Verify loadout unchanged (original skills still there)
- [ ] Cast Q skill - verify original Q skill casts, not previewed skill

### Cooldown Selection
- [ ] Cast all 4 skills (Q/W/E/R) to put them on cooldown
- [ ] Immediately preview a skill
- [ ] Verify preview still works (uses key with least cooldown)
- [ ] Wait for one skill cooldown to finish
- [ ] Preview again - verify uses the available key

### Multiple Previews
- [ ] Preview skill A
- [ ] Wait for preview to complete
- [ ] Immediately preview skill B
- [ ] Verify both previews work correctly
- [ ] Verify no errors in console

### Visual Effects
- [ ] Preview different skill types (projectile, AOE, beam, etc.)
- [ ] Verify each skill's unique visual effect displays
- [ ] Verify effects are cleaned up after preview
- [ ] Verify no lingering visual artifacts

### Edge Cases
- [ ] Preview while moving - verify works
- [ ] Preview while enemies nearby - verify works
- [ ] Preview same skill twice in a row - verify works
- [ ] Preview immediately after assigning a skill - verify works
- [ ] Close Hero Screen during countdown - verify no errors

---

## 3. Integration Tests

### Skills Tab → Book Tab
- [ ] Assign skill in Skills tab
- [ ] Switch to Book tab
- [ ] Preview the same skill
- [ ] Verify preview works correctly
- [ ] Return to Skills tab
- [ ] Verify assignment still correct

### Book Tab → Skills Tab
- [ ] Preview skill in Book tab
- [ ] Switch to Skills tab
- [ ] Verify loadout unchanged
- [ ] Assign the previewed skill
- [ ] Verify assignment works

### Skill Upgrades
- [ ] Upgrade a skill in Skills tab
- [ ] Preview the upgraded skill in Book tab
- [ ] Verify upgraded stats/effects apply
- [ ] Assign the upgraded skill
- [ ] Verify upgraded version is assigned

### Loadout Changes
- [ ] Assign 4 different skills
- [ ] Preview a 5th skill
- [ ] Verify preview works without changing loadout
- [ ] Click Reset button in Skills tab
- [ ] Verify loadout resets to default
- [ ] Preview again - verify still works

---

## 4. Console Checks

### No Errors
- [ ] Open browser console (F12)
- [ ] Perform all assignment operations
- [ ] Verify no JavaScript errors
- [ ] Perform all preview operations
- [ ] Verify no JavaScript errors

### Expected Warnings (OK)
- [ ] May see skill-related warnings (expected)
- [ ] May see effect loading messages (expected)

### Unexpected Errors (NOT OK)
- [ ] "Cannot read property of undefined"
- [ ] "Function is not defined"
- [ ] "Element not found"
- [ ] Any red error messages

---

## 5. Performance Tests

### Modal Performance
- [ ] Open/close modal 10 times rapidly
- [ ] Verify no memory leaks
- [ ] Verify modal always cleans up properly
- [ ] Check browser memory usage (should be stable)

### Preview Performance
- [ ] Preview 10 different skills in succession
- [ ] Verify frame rate stays smooth
- [ ] Verify no lag or stuttering
- [ ] Verify effects clean up properly

---

## 6. Mobile/Touch Tests (if applicable)

### Touch Interaction
- [ ] Tap assign button - verify modal opens
- [ ] Tap Q/W/E/R buttons - verify assignment works
- [ ] Tap Cancel - verify modal closes
- [ ] Tap preview button - verify preview works
- [ ] Verify no double-tap issues

### Responsive Design
- [ ] Verify modal fits on small screens
- [ ] Verify buttons are large enough to tap
- [ ] Verify text is readable
- [ ] Verify no horizontal scrolling

---

## 7. Accessibility Tests

### Keyboard Navigation
- [ ] Tab through modal buttons
- [ ] Verify focus visible
- [ ] Press Enter on focused button
- [ ] Verify works as expected

### Screen Reader (if available)
- [ ] Verify button labels are announced
- [ ] Verify modal title is announced
- [ ] Verify current bindings are announced

---

## 8. Cross-Browser Tests

### Chrome/Edge
- [ ] All tests pass

### Firefox
- [ ] All tests pass

### Safari
- [ ] All tests pass

---

## Bug Report Template

If you find any issues, report them with:

```
**Issue**: [Brief description]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Browser**: [Chrome/Firefox/Safari + version]
**Console Errors**: [Any error messages]
**Screenshot**: [If applicable]
```

---

## Success Criteria

✅ **All tests pass** = Ready for production
⚠️ **Minor issues** = Document and fix later
❌ **Major issues** = Fix before release

### Major Issues (Must Fix):
- Modal doesn't appear
- Skills not assigned correctly
- Preview changes loadout permanently
- JavaScript errors in console
- App crashes or freezes

### Minor Issues (Can Fix Later):
- Visual glitches
- Hover effects not perfect
- Timing slightly off
- Minor text issues

---

## Notes

- Test in order (1 → 8) for best results
- Take screenshots of any issues
- Note browser/OS for any problems
- Check console frequently
- Test both locked and unlocked skills
- Test with different skill levels

**Happy Testing! 🎮**