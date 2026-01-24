
## Plan: Update Modals to Candy Theme and Optimize Transitions

### Overview
The three answer modals (TimeUpModal, WrongAnswerModal, RightAnswerModal) still contain Christmas-themed styling with undefined color classes and Christmas emoji decorations. We'll update them to match the candy-crush inspired theme and reduce the transition time for a snappier feel.

---

### Changes

#### 1. TimeUpModal.jsx
**Current Issues:**
- Uses undefined Christmas colors: `frostBlue`, `snowWhite`
- Has ❄️ snowflake decorations

**Updates:**
- Replace gradient with candy theme: `from-blue-100 via-white to-purple-100`
- Replace border with `border-blue-400`
- Replace shadow with candy-style blue shadow
- Replace ❄️ decorations with ⏱️ clock/timer emojis
- Update title gradient to candy blue/purple

---

#### 2. WrongAnswerModal.jsx
**Current Issues:**
- Uses undefined Christmas colors: `cranberry`, `christmasRed`
- Has 🔔 bell decorations

**Updates:**
- Replace gradient with candy theme: `from-red-100 via-white to-pink-100`
- Replace border with `border-red-400`
- Replace shadow with candy-style red shadow
- Replace 🔔 decorations with 💔 or ❗ emojis
- Update title gradient to candy red/pink

---

#### 3. RightAnswerModal.jsx
**Current Issues:**
- Uses undefined Christmas colors: `christmasGreen`, `christmasGold`
- Has 🎄 🎁 ⭐ ❄️ 🔔 Christmas decorations
- Uses undefined `animate-ornament-swing`

**Updates:**
- Replace gradient with candy theme: `from-green-100 via-white to-yellow-100`
- Replace border with `border-emerald-400`
- Replace shadow with candy-style green shadow
- Replace Christmas emojis with celebratory candy emojis: ✨ 🎉 💫 🌟
- Replace 🎁 main icon with 🏆 or ✅
- Remove undefined animation classes

---

#### 4. Optimize Transition Speed

**TriviaMode.jsx (line 153):**
- Reduce `setTimeout` delay from 400ms to 200ms

**WordFillMode.jsx (line 145):**
- Reduce `setTimeout` delay from 300ms to 150ms

**All Modals:**
- Reduce enter animation from `duration-300` to `duration-200`
- Reduce leave animation from `duration-200` to `duration-150`

---

### Technical Details

| File | Lines Affected | Changes |
|------|----------------|---------|
| `src/components/ui/TimeUpModal.jsx` | 15-35 | Update colors, decorations, transitions |
| `src/components/ui/WrongAnswerModal.jsx` | 15-35 | Update colors, decorations, transitions |
| `src/components/ui/RightAnswerModal.jsx` | 22-50 | Update colors, decorations, remove Christmas animations |
| `src/modes/TriviaMode.jsx` | 153 | Reduce setTimeout to 200ms |
| `src/modes/WordFillMode.jsx` | 145 | Reduce setTimeout to 150ms |

---

### Visual Result

The modals will have:
- **TimeUp**: Blue/purple candy gradient with ⏱️ decorations
- **Wrong**: Red/pink candy gradient with ❗ decorations  
- **Right**: Green/yellow candy gradient with ✨ 🎉 decorations and 🏆 trophy icon
- **Faster transitions**: ~50% faster modal appearance after answering
