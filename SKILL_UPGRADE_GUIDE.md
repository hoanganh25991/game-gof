# Skill Upgrade System - Player Guide

## Overview
The God of Fire features a comprehensive skill progression system where you unlock new skills as you level up and can upgrade them to become more powerful.

---

## Skill Points

### Earning Skill Points
- **1 Skill Point** awarded per level-up
- Skill points are displayed at the top of the Skills tab: **⭐ Skill Points: X**
- Skill points persist across game sessions

### Using Skill Points
- Spend 1 skill point to upgrade any unlocked skill
- Each skill can be upgraded up to **Level 5**
- Upgrades are permanent and persist across sessions

---

## Skill Unlocking

### Unlock Levels
Skills unlock automatically as you level up:

| Player Level | Skills Unlocked | Total Skills |
|--------------|----------------|--------------|
| 1            | 4 skills       | 4            |
| 3            | 1 skill        | 5            |
| 5            | 1 skill        | 6            |
| 7            | 1 skill        | 7            |
| 10           | 1 skill        | 8            |
| 12           | 1 skill        | 9            |
| 15           | 1 skill        | 10           |
| 18           | 1 skill        | 11           |
| 20           | 1 skill        | 12           |
| 22           | 1 skill        | 13           |
| 25           | 1 skill        | 14           |
| 28           | 1 skill        | 15           |
| 30           | 1 skill        | 16           |
| 33           | 1 skill        | 17           |
| 36           | 1 skill        | 18           |
| 40           | 1 skill        | 19           |
| 45           | 1 skill        | 20           |
| 50           | 1 skill        | 21           |

### Visual Indicators
- **Locked Skills:** Shown with 50% opacity, grayscale filter, and 🔒 icon
- **Unlock Level:** Displayed as "(Lv X)" next to locked skills
- **Unlocked Skills:** Full color, clickable, can be assigned and upgraded

---

## Skill Upgrades

### Upgrade Bonuses
Each skill level provides cumulative bonuses:

| Stat          | Level 2 | Level 3 | Level 4 | Level 5 |
|---------------|---------|---------|---------|---------|
| **Damage**    | +15%    | +30%    | +50%    | +75%    |
| **Cooldown**  | -10%    | -18%    | -25%    | -35%    |
| **Range**     | +10%    | +20%    | +30%    | +40%    |
| **Radius**    | +12%    | +25%    | +40%    | +60%    |
| **Duration**  | +15%    | +30%    | +50%    | +75%    |
| **Mana Cost** | -8%     | -15%    | -22%    | -30%    |

### Example: Inferno Blast
**Base Stats (Level 1):**
- Damage: 100
- Cooldown: 8s
- Range: 30m
- Mana: 50

**Level 5 Stats:**
- Damage: 175 (+75%)
- Cooldown: 5.2s (-35%)
- Range: 42m (+40%)
- Mana: 35 (-30%)

---

## Using the Skills Tab

### Opening the Skills Tab
1. Press **H** key (or tap Hero button on mobile)
2. Click the **Skills** tab

### Skill Pool Display
Each skill shows:
- **Icon:** Visual representation with level badge (1-5)
- **Name:** Skill name
- **Description:** What the skill does
- **Requirements:** Unlock level and current level (X/5)
- **Buttons:**
  - **⬆️ Upgrade:** Spend 1 skill point to upgrade (disabled if max level or no points)
  - **➕ Assign:** Add skill to your loadout (Q/W/E/R)

### Upgrading a Skill
1. Ensure you have skill points available
2. Click the **⬆️** button next to the skill
3. The skill level badge updates immediately
4. Your loadout refreshes automatically if the skill is equipped
5. Skill points counter decreases by 1

### Assigning Skills
1. Click the **➕** button or click the skill row
2. Select which key to assign (Q, W, E, or R)
3. The skill replaces the previous skill in that slot
4. Upgraded bonuses apply automatically

---

## Visual Feedback

### Level-Up Notifications
When you level up, you'll see:
- **"⭐ +1 Skill Point"** (gold notification)
- Appears in center of screen for 2 seconds

### Skill Unlock Notifications
When you unlock a new skill:
- **"🔓 New Skill Unlocked!"** (orange notification)
- Appears in center of screen for 2.5 seconds
- Check the Skills tab to see your new skill!

### Skill Level Badges
- **Level 1:** No badge (base level)
- **Level 2-5:** Colored badge with number on skill icon
- Badge color indicates power level

---

## Strategy Tips

### Early Game (Levels 1-10)
- Focus on upgrading your most-used skills first
- Prioritize damage upgrades for faster enemy clearing
- Save some points for new skills that unlock at level 10

### Mid Game (Levels 11-25)
- Balance between upgrading core skills and trying new unlocks
- Consider cooldown reduction for skills you use frequently
- Experiment with different skill combinations

### Late Game (Levels 26+)
- Max out your favorite skills to level 5
- Build specialized loadouts for different situations
- Try high-level skills that unlock at 30, 36, 40, 45, 50

### Upgrade Priority
1. **Damage Skills:** Upgrade first for faster progression
2. **AOE Skills:** Great for clearing groups of enemies
3. **Utility Skills:** Upgrade when you have spare points
4. **Defensive Skills:** Important for survival in late game

---

## Persistence

### What's Saved
- Skill levels (all upgrades persist)
- Skill points (unspent points carry over)
- Unlocked skills (based on your level)
- Current loadout (Q/W/E/R assignments)

### What Resets
- Nothing! All progression is permanent
- Even if you die, your skill upgrades remain

---

## Troubleshooting

### "I can't upgrade a skill"
- Check if you have skill points available (top of Skills tab)
- Verify the skill isn't already at max level (5/5)
- Ensure the skill is unlocked (not showing 🔒 icon)

### "My upgraded skill doesn't feel stronger"
- Upgrades apply automatically when you cast the skill
- Check the skill description for what stats are improved
- Some bonuses (like cooldown) are more noticeable than others

### "I lost my skill points"
- Skill points are saved to localStorage
- Check if browser cleared your data
- Skill points only decrease when you upgrade skills

### "A skill is locked even though I'm high level"
- Skills unlock at specific levels (see table above)
- Check the "(Lv X)" indicator next to the skill
- You may need to level up more to unlock it

---

## Advanced Features

### Loadout Management
- You can have 4 skills active at once (Q/W/E/R)
- Swap skills anytime from the Skills tab
- Upgraded bonuses apply to whichever slot the skill is in

### Skill Synergies
- Combine skills for powerful combos
- Example: AOE damage + Mark (vulnerability) = massive damage
- Experiment to find your favorite combinations

### Respec (Future Feature)
- Currently, upgrades are permanent
- Plan your upgrades carefully
- You'll earn enough points to max multiple skills by level 50

---

## Quick Reference

### Keyboard Shortcuts
- **H:** Open Hero screen
- **Q/W/E/R:** Cast equipped skills
- **ESC:** Close Hero screen

### Skill Point Economy
- **Level 1-10:** 10 skill points earned
- **Level 1-25:** 25 skill points earned
- **Level 1-50:** 50 skill points earned
- **To max 1 skill:** 4 points (level 1→5)
- **To max 4 skills:** 16 points (full loadout)
- **To max 10 skills:** 40 points (by level 40)

---

## Summary

The skill upgrade system adds depth and progression to God of Fire:
- **Unlock** new skills as you level up
- **Upgrade** skills with skill points (1 per level)
- **Customize** your loadout with 4 active skills
- **Persist** all progress across sessions
- **Optimize** for your playstyle

**Have fun mastering the flames!** 🔥