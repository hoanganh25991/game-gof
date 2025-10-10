# Effects System Testing Checklist

## Pre-Testing Setup

- [x] All 18 effect files created in `src/effects/`
- [x] `skills_fx.js` restructured with new configuration
- [x] `effects_base.js` enhanced with 6 new primitives
- [x] No syntax errors in core files
- [x] Server running on port 8000
- [ ] Browser opened to `http://localhost:8000`
- [ ] Console open for error checking

## Visual Testing - Chain Skills

### Flame Chain 🔗
- [ ] Lightning-style bolts visible
- [ ] Branches appear on chains
- [ ] Sparks along chain links
- [ ] Impact explosions at targets
- [ ] Shockwaves expand properly
- [ ] Glowing spheres at connections
- [ ] Colors: Orange-red, tomato, gold

**Expected**: Electric fire chains with branching energy

---

## Visual Testing - AOE Blast Skills

### Inferno Blast 💥
- [ ] Massive core explosion
- [ ] 3 expanding shockwave rings
- [ ] 8 vertical fire columns
- [ ] Smoke particles appear
- [ ] Upward cone blast
- [ ] 50+ particles visible
- [ ] Colors: Orange-red, yellow flash

**Expected**: Catastrophic explosion with towering flames

### Flame Ring 💥
- [ ] 3 concentric rings visible
- [ ] 12 flame spouts around perimeter
- [ ] Rotating spiral beams
- [ ] Inward beams to center
- [ ] Pulsing center spheres
- [ ] 45+ particles
- [ ] Colors: Tomato, orange-red, gold inner

**Expected**: Rotating rings with connecting beams

### Ember Burst 💥
- [ ] 100+ ember particles
- [ ] Upward floating effect
- [ ] 24 radial burst directions
- [ ] Pulsing glow spheres
- [ ] 3 expanding ground rings
- [ ] Central pillar
- [ ] Colors: Orange, dark orange, orange-red

**Expected**: Massive floating ember burst

### Pyroclasm 🌋
- [ ] Multi-stage explosion (3 stages)
- [ ] 5 massive shockwave rings
- [ ] 12 towering fire columns
- [ ] 20 radiating ground cracks
- [ ] Flames along cracks
- [ ] 100+ particles
- [ ] Central pillar (12 units tall)
- [ ] Colors: Orange-red, dark red, yellow explosion

**Expected**: Catastrophic ground devastation

---

## Visual Testing - Aura Skills

### Burning Aura 🔥
- [ ] 2 pulsing concentric rings
- [ ] 30+ floating embers
- [ ] 8 vertical flame spouts
- [ ] Upward-drifting embers
- [ ] Central glow sphere
- [ ] Colors: Dark orange, orange, tomato

**Expected**: Living aura with floating embers

### Blazing Aura 🔥
- [ ] White-hot core visible
- [ ] Golden flames (brighter than Burning)
- [ ] 3 concentric rings (more than Burning)
- [ ] Spiral heat effect
- [ ] Taller pillars (3.5 units)
- [ ] Heat distortion waves
- [ ] 40 particles
- [ ] Colors: Gold, white core, yellow

**Expected**: Intense golden inferno (hotter than Burning)

### Scorching Field 🔥
- [ ] 12 radiating ground cracks
- [ ] 8 flame spouts from fissures
- [ ] Dark red scorched ground
- [ ] 4 pulsing heat waves
- [ ] 35 floating embers
- [ ] Glowing crack segments
- [ ] Central heat pillar
- [ ] Colors: Tomato, dark orange, dark red ground

**Expected**: Cracked burning ground with geysers

### Inferno Overload 🔆
- [ ] Massive yellow explosion
- [ ] 6 spiraling fire streams
- [ ] 4 expanding explosion waves
- [ ] 60+ particles in waves
- [ ] 16 radiating fire beams
- [ ] Central pillar (5 units tall)
- [ ] 6 pulsing core spheres
- [ ] Colors: Orange-red, gold, yellow explosion

**Expected**: Explosive overload with spirals

---

## Visual Testing - Storm Skills

### Meteor Storm 🌋
- [ ] Meteors fall from sky (15 units up)
- [ ] 8-segment long trails
- [ ] Crater impacts
- [ ] 3 shockwave rings per impact
- [ ] 40 debris particles per meteor
- [ ] Upward fire cone from impact
- [ ] Lingering crater glow (1.5s)
- [ ] Colors: Orange-red, dark red, yellow impact

**Expected**: Meteors falling with trails and craters

### Volcanic Wrath 🌋
- [ ] Central volcano cone (12 units tall)
- [ ] 5 lava fountains
- [ ] 8 black smoke columns
- [ ] 12 flying lava bombs (arcing)
- [ ] Lava bomb impacts
- [ ] Molten ground pools
- [ ] 70+ erupting particles
- [ ] Colors: Orange-red, dark red, black smoke

**Expected**: Erupting volcano with lava fountains

### Fire Dome 🌋
- [ ] 16 rotating fire pillars
- [ ] Connecting arcs between pillars
- [ ] 3 layered shield rings
- [ ] Central energy pillar (6 units tall)
- [ ] Spiral effect around center
- [ ] 80+ particle streams
- [ ] 5 pulsing ground rings
- [ ] Colors: Tomato, orange-red, gold, dark orange shield

**Expected**: Protective dome structure

### Lava Storm 🌋
- [ ] 10 lava geysers erupting
- [ ] 20 bubbling lava pools
- [ ] 8-direction splash arcs
- [ ] Molten ground pools
- [ ] Ground cracks radiating
- [ ] Geyser pillars and cones
- [ ] 60 lava particles per geyser
- [ ] Colors: Orange-red, dark red, orange, dark crust

**Expected**: Bubbling lava field with geysers

---

## Visual Testing - Projectile Skills

### Fire Bolt 🔥
- [ ] 8 segmented bolt (alternating colors)
- [ ] 12 trailing sparks
- [ ] Glowing segment spheres
- [ ] Concentrated impact flash
- [ ] Expanding shockwave
- [ ] Piercing effect visible
- [ ] Fast speed (32 units/s)
- [ ] Colors: Tomato, orange, gold sparks

**Expected**: Fast segmented bolt with sparks

### Fireball 🔮
- [ ] Spinning fireball visible
- [ ] Spiral trail particles (3 per step)
- [ ] Multi-layered explosion (3 rings)
- [ ] Expanding shockwaves
- [ ] 25 main + 15 ember particles
- [ ] Ground scorch ring
- [ ] Yellow core flash
- [ ] Colors: Tomato, orange, orange-red, yellow

**Expected**: Spinning ball with spiral trail

### Flame Spear 🔥
- [ ] Elongated spear model (3 units)
- [ ] Glowing golden tip
- [ ] Spiral trail effect
- [ ] Pierce-through effect (1.5 units)
- [ ] Dual impacts (entry + exit)
- [ ] 2 shockwave rings
- [ ] Tip glow trail (15 segments)
- [ ] Colors: Orange-red, tomato, gold tip

**Expected**: Elongated piercing spear

### Heatwave 🔥
- [ ] 5 expanding ripple waves
- [ ] Vertical heat pillars at ripples
- [ ] 40 heat distortion particles
- [ ] Ground scorch trail (15 segments)
- [ ] Wide wave effect (2 units width)
- [ ] Upward-floating heat particles
- [ ] Final explosion at target
- [ ] Colors: Dark orange, orange, tomato

**Expected**: Expanding wave with distortion

---

## Visual Testing - Nova Skills

### Flame Nova 💥
- [ ] Yellow core explosion
- [ ] Upward explosion cone (60°, 20 rays)
- [ ] 3 expanding pulse waves
- [ ] 16 radial flame rays
- [ ] Flame pillar at each ray end
- [ ] Impact at each ray end
- [ ] 60 main + 40 secondary particles
- [ ] Ground ring
- [ ] Colors: Tomato, orange-red, gold, yellow core

**Expected**: Explosive radial burst with rays

---

## Performance Testing

### Frame Rate
- [ ] FPS stays above 30 during single skill
- [ ] FPS stays above 20 during multiple skills
- [ ] No significant stuttering
- [ ] Particle counts adjust with quality setting

### Memory
- [ ] No memory leaks after 5 minutes
- [ ] Effects clean up properly
- [ ] No orphaned objects in scene

### Quality Settings
- [ ] Low quality: Reduced particles (50%)
- [ ] Medium quality: Reduced particles (75%)
- [ ] High quality: Full particles (100%)

---

## Functional Testing

### Effect Triggering
- [ ] Effects trigger on skill use
- [ ] Effects appear at correct position
- [ ] Effects follow targets correctly
- [ ] Chain effects connect properly
- [ ] Storm effects repeat correctly

### Timing
- [ ] Multi-stage effects time correctly
- [ ] Effects don't linger too long
- [ ] Effects don't disappear too quickly
- [ ] setTimeout delays work properly

### Parameters
- [ ] Colors match configuration
- [ ] Sizes scale correctly
- [ ] Particle counts respect limits
- [ ] Custom parameters work

---

## Visual Quality Testing

### Colors
- [ ] Colors are vibrant and visible
- [ ] Color progression makes sense (weak→strong)
- [ ] Accent colors stand out
- [ ] No color clashing

### Scale
- [ ] Effects match skill power level
- [ ] Sizes are appropriate for gameplay
- [ ] Not too small to see
- [ ] Not too large to obscure view

### Clarity
- [ ] Can identify skill by visual alone
- [ ] Effects don't obscure enemies
- [ ] Multiple effects don't create visual chaos
- [ ] Important elements stand out

---

## Bug Checking

### Console Errors
- [ ] No JavaScript errors
- [ ] No import errors
- [ ] No undefined variables
- [ ] No failed effect loads

### Visual Bugs
- [ ] No flickering effects
- [ ] No z-fighting (overlapping geometry)
- [ ] No effects stuck in scene
- [ ] No invisible effects

### Performance Bugs
- [ ] No infinite loops
- [ ] No excessive particle spawning
- [ ] No memory leaks
- [ ] No FPS drops to single digits

---

## Comparison Testing

### Skill Distinctiveness
- [ ] Each skill looks unique
- [ ] Can identify skill without UI
- [ ] Visual style matches skill theme
- [ ] No two skills look too similar

### Power Scaling
- [ ] Weak skills have smaller effects
- [ ] Strong skills have larger effects
- [ ] Ultimate skills are most impressive
- [ ] Visual intensity matches damage

---

## User Experience Testing

### Satisfaction
- [ ] Effects feel impactful
- [ ] Satisfying to use repeatedly
- [ ] Visual feedback is clear
- [ ] Effects enhance gameplay

### Clarity
- [ ] Can see what's happening
- [ ] Understand skill effects
- [ ] Know when skill hits
- [ ] Can track multiple effects

---

## Final Checklist

- [ ] All 18 skills tested individually
- [ ] All skills tested in combination
- [ ] Performance acceptable on target hardware
- [ ] No critical bugs found
- [ ] Visual quality meets expectations
- [ ] User experience is positive
- [ ] Ready for production

---

## Issues Found

### Critical (Must Fix):
- [ ] None found

### Major (Should Fix):
- [ ] None found

### Minor (Nice to Fix):
- [ ] None found

---

## Tuning Notes

### Colors to Adjust:
- [ ] None needed

### Sizes to Adjust:
- [ ] None needed

### Timings to Adjust:
- [ ] None needed

### Particle Counts to Adjust:
- [ ] None needed

---

## Sign-Off

- [ ] Visual testing complete
- [ ] Performance testing complete
- [ ] Functional testing complete
- [ ] Bug checking complete
- [ ] Ready for gameplay testing
- [ ] Ready for player feedback

**Tester**: _______________  
**Date**: _______________  
**Status**: _______________

---

## Next Steps After Testing

1. **If Issues Found**: Document and fix
2. **If Performance Issues**: Optimize particle counts
3. **If Visual Issues**: Adjust colors/sizes in `skills_fx.js`
4. **If All Good**: Mark as production-ready
5. **Gather Feedback**: Get player reactions
6. **Iterate**: Make improvements based on feedback

---

## Quick Test Commands

```bash
# Start server
python3 -m http.server 8000

# Open browser
open http://localhost:8000

# Check console
# Press F12 in browser

# Test specific skill
# Equip skill and use in combat
```

---

## Expected Test Duration

- **Quick Test** (all skills once): 15-20 minutes
- **Thorough Test** (all checklist items): 1-2 hours
- **Performance Test**: 30 minutes
- **Bug Hunting**: 30 minutes

**Total**: 2-3 hours for complete testing

---

## Success Criteria

✅ All 18 skills have unique, memorable visuals  
✅ Performance is acceptable (FPS > 30)  
✅ No critical bugs  
✅ Effects enhance gameplay experience  
✅ Visual quality is professional  
✅ Players can identify skills by appearance  

**If all criteria met**: SHIP IT! 🚀