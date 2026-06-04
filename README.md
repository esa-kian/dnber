# Atmosphere: DnB MIDI Generator

An open-source web app for generating ambient drum and bass, jungle, and neurofunk MIDI sketches.

The generator creates separate MIDI tracks for drums, bass, atmosphere, stabs, and FX. Use the controls to shape the arrangement before importing the `.mid` file into a DAW.

## What This App Makes

Atmosphere does not render finished audio by itself. It creates a `.mid` file, which is a set of musical instructions: which notes to play, when they happen, how hard they hit, and which MIDI channel they belong to.

You import that MIDI file into a music app like Ableton, Logic, GarageBand, FL Studio, Bitwig, Reaper, or Cubase. Then you choose the actual sounds: drums, bass synths, pads, and effects.

Think of it as a sketch generator for DnB ideas. It gives you the arrangement and musical movement; your DAW gives it sound design and mixing.

## Quick Start

1. Choose an engine: **Ambient DnB**, **Jungle**, or **Neurofunk**.
2. Choose a mood or style.
3. Pick a tempo and length.
4. Leave the key and scale on the defaults if you are unsure.
5. Adjust the detail controls if you want more or less movement.
6. Click **Generate Composition**.
7. Download the `.mid` file.
8. Import the file into your DAW.
9. Put sounds on each MIDI track.

## Engines

### Ambient DnB

Ambient DnB creates smoother, spacious sketches with pads, sub bass, Reese bass, echo plucks, and clean breakbeat drums.

Use this when you want liquid, deep, atmospheric, or floating DnB ideas.

### Jungle

Jungle treats the break as the lead instrument. It writes chopped Amen/Think/Apache-style drum programming, dub sub bass, pads, rave stabs, sirens, phrase-end edits, and breakdowns.

Important: this is still MIDI. For the most authentic result, put a sliced break kit or sampler on the drum track instead of a plain acoustic drum kit. The MIDI gives you the chop timing and accents; your drum rack gives it the sample character.

Use this when you want classic, ragga, darkside, or atmospheric jungle sketches.

### Neurofunk

Neurofunk creates tighter, more technical sketches with punchy drums, short root-centered bass phrases, pitch-bend movement, bass call-and-response, stabs, and risers.

Important: the generator writes MIDI, not the actual growling bass sound. For neurofunk, the MIDI gives you the rhythm and note movement. The final sound depends heavily on the synth patch, distortion, filtering, resampling, and mixing you use in your DAW.

Use this when you want a darker, more mechanical, bass-led DnB idea.

## Ambient Controls

### Mood

Mood changes the overall musical personality.

- **Liquid**: smoother, more melodic, good default for classic atmospheric DnB.
- **Deep**: darker and more restrained, with steadier bass movement.
- **Dark**: moodier, more tense, better for shadowy or heavier sketches.
- **Ethereal**: lighter and floatier, with more high atmospheric notes.

If you do not know what to choose, start with **Liquid**.

### Tempo

Tempo controls speed in BPM, which means beats per minute.

Ambient drum and bass usually lives around **160-180 BPM**. The default, **174 BPM**, is a common DnB tempo.

Lower values feel more relaxed. Higher values feel more urgent.

### Length

Length controls how long the generated MIDI sketch will be.

Shorter lengths are useful for quickly making loops or testing ideas. Longer lengths create more of an arrangement with intros, drops, breakdowns, and outros.

### Key

Key chooses the home note of the track.

If music theory is new to you, think of the key as the note the track feels centered around. For example, **F** means the generated notes will tend to feel like they belong around F.

There is no wrong answer here. Try a key, generate a MIDI file, and change it if the mood feels too bright, too dark, or simply not right.

### Scale Type

Scale type chooses the note family the generator uses.

- **Dorian**: a strong default for liquid and atmospheric DnB. Slightly moody but not too sad.
- **Natural Minor**: darker and more emotional.
- **Phrygian**: tense, shadowy, and more dramatic.
- **Major**: brighter and more uplifting.

If you are unsure, use **Dorian** for liquid/deep tracks and **Natural Minor** or **Phrygian** for darker tracks.

### Breaks

Breaks controls how busy the drums are.

Lower values create simpler percussion with more room. Higher values add more ghost snares, hats, rides, extra kicks, and fills.

For a clean ambient DnB starting point, try **50-70%**.

### Harmony

Harmony controls how much the musical parts vary.

Lower values keep the bass and chords more stable. Higher values add more passing notes, alternate chord choices, and phrase variation.

If the MIDI feels too random, lower Harmony. If it feels too repetitive, raise it.

### Air

Air controls the atmospheric details.

Lower values keep the track more grounded. Higher values add more high notes, shimmer, echoes, and pad color.

For ambient DnB, Air is usually nice around **70-90%**.

## Jungle Controls

### Style

Style changes the break and support parts.

- **Classic**: Amen-led pressure with dub sub and clean stabs.
- **Ragga**: more offbeat stabs and a more syncopated bass feel.
- **Darkside**: darker notes, heavier sub, and more tense break edits.
- **Atmospheric**: smoother pads and more space around the breaks.

If you are unsure, start with **Classic**.

### Tempo

Jungle usually works well around **150-170 BPM**. The default is **164 BPM**.

### Breaks

Breaks controls how dominant the chopped breakbeat is.

Lower values make the break lighter. Higher values make the Amen/Think/Apache-style hits more forceful and frequent.

### Chops

Chops controls edits, retriggers, fill density, and phrase-end break variations.

Lower values keep the break rolling and readable. Higher values create more classic jungle edits and drum fills.

### Sub

Sub controls the weight and movement of the low bass.

Lower values leave more room for drums. Higher values add more dub bass hits and occasional slides.

### Dub Space

Dub Space controls pads, FX, sirens, and room around the groove.

Raise it for atmospheric or dubby jungle. Lower it when you want the break and sub to dominate.

## Neurofunk Controls

### Style

Style changes the kind of neurofunk phrase the generator writes.

- **Rolling**: steady and usable, with strong two-bar bass phrases.
- **Techstep**: sharper and more syncopated.
- **Dark**: tense, sparse, and heavy.
- **Minimal**: stripped back, darker, and more spacious.

If you are unsure, start with **Techstep**.

### Tempo

Neurofunk usually works well around **168-178 BPM**. The default is **174 BPM**.

### Scale Type

Neurofunk often works best with darker scales.

- **Phrygian**: tense and aggressive.
- **Natural Minor**: dark but less harsh.
- **Dorian**: a little smoother.

### Drums

Drums controls how forceful and busy the beat is.

Lower values keep the rhythm cleaner. Higher values add more hats, ghost notes, open hats, and phrase-end fills.

### Bass Motion

Bass Motion controls how much the neuro bass phrase moves.

Lower values stay closer to the root note. Higher values add more passing tones, stronger pitch bends, filter movement, and call-and-response between the two neuro bass tracks.

### Tech

Tech controls extra rhythmic detail.

Lower values keep the phrase simpler. Higher values add more stutters, octave jabs, and tighter phrase variations.

### Tension

Tension controls stabs, risers, darker note choices, and FX movement.

Raise it when you want the sketch to feel more dramatic. Lower it when you want more room for your own production.

## Ambient MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Evolving Pads | Warm pad, soft strings, airy synth, reverb-heavy texture |
| 2 | Sub Bass | Clean sine/sub bass, simple low synth |
| 3 | Echo Plucks | Bell, mallet, glassy pluck, delay-heavy synth |
| 4 | Reese Bass | Wide bass synth, detuned saw bass, darker mid bass |
| 10 | Break Kit | Drum rack, breakbeat kit, acoustic/electronic drum kit |

## Jungle MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Pads | Warm pad, dark pad, strings, atmosphere |
| 2 | Dub Sub | Clean sine/sub bass, 808-style bass, simple low synth |
| 3 | Rave and Dub Stabs | Piano stab, organ stab, vocal hit, dub chord |
| 4 | FX and Sirens | Siren, noise sweep, dub FX, impact layer |
| 10 | Chopped Breaks | Sliced Amen/Think/Apache kit, breakbeat drum rack |

## Neurofunk MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Stabs | Short brass stab, distorted synth hit, metallic chord |
| 2 | Sub Weight | Clean sine/sub bass under the main bass phrase |
| 5 | Bass Main | Main growl, FM bass, wavetable bass, distorted saw bass |
| 6 | Bass Response | Second bass patch for call-and-response movement |
| 7 | FX Risers | Noise riser, tonal FX, glassy sweep, impact layer |
| 10 | Tight Drums | Punchy DnB kit, layered kick/snare, tight hats |

## How To Make It Sound More Finished

After importing the MIDI, the biggest improvement comes from choosing good sounds.

For ambient pads, use a soft synth sound with long attack and plenty of reverb. For sub bass, use a clean low sound and keep it simple. For Reese bass, use something wider and dirtier, but keep it quieter than the sub. For drums, try a breakbeat-style kit or slice the drum MIDI into your favorite drum rack.

For jungle drums, use a breakbeat sampler or drum rack with kick, snare, hats, toms, and ghost snare layers. The Chopped Breaks track is written like a sliced break, so it will sound most convincing when the drum sounds are short, gritty, and sample-like. Keep the Dub Sub track clean and heavy.

For neurofunk bass, use a synth patch with movement: wavetable, FM, formant, comb filtering, distortion, or automated filter cutoff. Put different sounds on Bass Main and Bass Response so the phrase talks back and forth. The MIDI includes pitch bend, mod wheel, filter cutoff, and resonance automation cues. Keep the Sub Weight track clean and centered underneath them.

Add reverb and delay to pads, plucks, stabs, and FX. Keep the sub bass mostly dry. Add compression or saturation to the drums if they feel too flat.

## Good Beginner Settings

Try these combinations:

| Goal | Engine | Style/Mood | Scale | Main Controls |
| --- | --- | --- | --- | --- |
| Smooth liquid | Ambient | Liquid | Dorian | Breaks 58%, Harmony 70%, Air 80% |
| Dark ambient | Ambient | Dark | Phrygian | Breaks 55%, Harmony 60%, Air 85% |
| Deep roller | Ambient | Deep | Natural Minor | Breaks 65%, Harmony 55%, Air 65% |
| Floating intro | Ambient | Ethereal | Major or Dorian | Breaks 35%, Harmony 65%, Air 95% |
| Classic jungle | Jungle | Classic | Natural Minor | Breaks 86%, Chops 72%, Sub 82%, Dub Space 62% |
| Ragga jungle | Jungle | Ragga | Dorian | Breaks 82%, Chops 68%, Sub 78%, Dub Space 58% |
| Darkside jungle | Jungle | Darkside | Phrygian | Breaks 88%, Chops 76%, Sub 86%, Dub Space 70% |
| Atmospheric jungle | Jungle | Atmospheric | Dorian | Breaks 68%, Chops 48%, Sub 65%, Dub Space 88% |
| Hard techstep neuro | Neurofunk | Techstep | Phrygian | Drums 82%, Bass Motion 88%, Tech 78%, Tension 82% |
| Sparse dark neuro | Neurofunk | Dark | Natural Minor | Drums 62%, Bass Motion 58%, Tech 45%, Tension 82% |
| Clean neuro roller | Neurofunk | Rolling | Phrygian | Drums 74%, Bass Motion 78%, Tech 62%, Tension 74% |

## A Tiny Music Theory Cheat Sheet

You do not need theory to use the app, but these ideas help:

- **BPM** is speed.
- **Key** is the note the track feels centered on.
- **Scale** is the set of notes the generator is allowed to use.
- **Chord** is several notes played together.
- **Bass** is the low musical part that supports the track.
- **Breakbeat** is a chopped or syncopated drum pattern, common in DnB.
- **Ghost notes** are quiet drum hits that make a beat feel more human.
- **Arrangement** is the bigger shape of the track: intro, build, drop, breakdown, outro.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
