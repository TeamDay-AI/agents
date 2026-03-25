# Anti-Slop Pattern Reference

Complete ruleset for detecting and eliminating AI-generated writing patterns.

---

## Banned Phrases

These phrases are AI tells. Remove or replace every instance.

### Throat-Clearing Openers
Never start a sentence or paragraph with these:

- "It's worth noting that..."
- "It's important to note..."
- "Interestingly enough..."
- "In today's [landscape/world/era]..."
- "In the realm of..."
- "When it comes to..."
- "At the end of the day..."
- "Let's dive in..."
- "Let's unpack this..."
- "At its core..."

**Fix:** Delete the opener entirely. Start with the actual point.

### Emphasis Crutches
These add no meaning — they're filler:

- "Truly" / "Certainly" / "Undeniably"
- "Arguably"
- "Essentially"
- "Fundamentally"
- "Notably"
- "Remarkably"
- "It's crucial to..."
- "It cannot be overstated..."

**Fix:** Remove them. If the statement needs emphasis, make the evidence stronger.

### Vague Quantifiers
AI uses these to avoid committing to specifics:

- "Various" / "Numerous" / "Countless"
- "Significant" / "Substantial"
- "A wide range of"
- "A myriad of"
- "Plethora"
- "Multifaceted"
- "Comprehensive"

**Fix:** Use actual numbers, or name the things. "Various tools" → "Slack, Notion, and Linear."

### Business Jargon (AI Flavor)
These sound corporate and hollow:

- "Leverage" (as a verb)
- "Utilize" (just say "use")
- "Optimize" (when you mean "improve")
- "Streamline"
- "Spearhead"
- "Cutting-edge" / "Game-changing" / "Revolutionary"
- "Best-in-class"
- "Paradigm shift"
- "Ecosystem" (unless literally about biology)
- "Synergy"
- "Unlock" (as in "unlock potential")
- "Harness" (as in "harness the power")
- "Empower"
- "Elevate"
- "Supercharge"

**Fix:** Say what actually happens. "Leverage AI to streamline workflows" → "We used GPT-4 to cut review time from 3 hours to 20 minutes."

### Meta-Commentary
AI narrates what it's doing instead of doing it:

- "Let me explain..."
- "Here's the thing..."
- "The key takeaway is..."
- "To put it simply..."
- "In other words..."
- "That said..."
- "With that in mind..."
- "Moving forward..."

**Fix:** Delete. Just make the point directly.

---

## Banned Structural Patterns

### 1. The Triple Structure (Rule of Three Abuse)
AI defaults to three examples, three adjectives, three bullet points. Not because three is right, but because it's the model's default.

**Detection:** Count your parallel structures. Are they always three? Vary them: use two, four, or one strong example instead.

### 2. The Sycophantic Opener
Starting responses with agreement or praise before the actual content:

- "Great question!"
- "That's a really interesting point."
- "Absolutely!"
- "You're absolutely right that..."

**Fix:** Start with the answer.

### 3. The False Balance
AI hedges everything: "While X has benefits, it also has drawbacks." This creates the illusion of nuance without actual analysis.

**Fix:** Take a position. State it. Support it. Acknowledge one strong counterargument if relevant, then explain why your position still holds.

### 4. The Excessive Transition
Every paragraph starts with a transition phrase connecting to the last. Real writing jumps. It trusts the reader to follow.

**Fix:** Delete transition sentences. If the flow still works (it usually does), they were unnecessary.

### 5. The Summary Recap
Restating everything that was just said in a "to summarize" or "in conclusion" section.

**Fix:** End with the last strong point or a forward-looking statement. Don't recap.

### 6. The Exhaustive List
AI lists every possible angle rather than choosing the most important ones. A post about "productivity tips" has 15 items when 5 strong ones would be better.

**Fix:** Cut to the 3-5 strongest points. Depth beats breadth.

### 7. The Uniform Sentence Length
AI writes sentences of remarkably similar length and rhythm. Real writing varies: short punches between longer explanations.

**Fix:** After writing, read aloud. Break long sentences. Combine short ones. Mix rhythm deliberately.

### 8. The Passive Hedge
AI avoids naming who does what: "mistakes were made", "it can be argued", "it has been shown".

**Fix:** Name the actor. "Researchers at MIT showed..." or "I've seen this fail when..."

---

## False Agency Detection

This is the most subtle AI tell. Inanimate things get human verbs:

- "The data **tells** us..."
- "The market **rewards** those who..."
- "This approach **demands** that..."
- "The results **speak** for themselves"
- "The numbers **paint** a picture"
- "Technology **enables** us to..."
- "The platform **empowers** users"
- "The algorithm **wants** engagement"

**Why it matters:** Real writers attribute actions to people. AI attributes actions to abstractions because it avoids committing to who specifically does what.

**Fix:** Name the human. "The data tells us" → "Looking at the conversion rates, we decided..." or "Our analytics team found..."

---

## Em-Dash Rule

**Em-dashes (—) are banned.** Not "use sparingly." Banned.

AI uses em-dashes as a crutch for connecting clauses it can't integrate naturally. Every em-dash can be replaced by:
- A period (make it two sentences)
- A comma
- Parentheses
- Restructuring the sentence

---

## The Distinctiveness Test

After revision, ask: **"Could any AI have written this?"**

If yes, it needs more:
- **Opinion** — what do YOU think, not what "experts say"
- **Specificity** — names, dates, exact numbers from real experience
- **Voice** — irregular rhythm, personal quirks, humor, directness
- **Surprise** — at least one unexpected angle or framing

The goal is not "perfect prose." The goal is writing that could only have come from this specific person writing about this specific thing.
