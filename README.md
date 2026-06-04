# Atmosphere: Ambient DnB MIDI Generator

An open-source web app for generating ambient drum and bass MIDI sketches with evolving pads, sub/Reese bass, atmospheric plucks, and breakbeat percussion.

The generator creates separate MIDI tracks for pads, sub bass, Reese bass, atmosphere, and drums. Use the mood and realism controls to shape the arrangement before importing the `.mid` file into a DAW.

## What This App Makes

Atmosphere does not render finished audio by itself. It creates a `.mid` file, which is a set of musical instructions: which notes to play, when they happen, how hard they hit, and which MIDI channel they belong to.

You import that MIDI file into a music app like Ableton, Logic, GarageBand, FL Studio, Bitwig, Reaper, or Cubase. Then you choose the actual sounds: drums, bass synths, pads, and effects.

Think of it as a sketch generator for ambient drum and bass ideas. It gives you the arrangement and musical movement; your DAW gives it sound design and mixing.

## Quick Start

1. Choose a mood.
2. Pick a tempo and length.
3. Leave the key and scale on the defaults if you are unsure.
4. Adjust Breaks, Harmony, and Air if you want more or less detail.
5. Click **Generate Composition**.
6. Download the `.mid` file.
7. Import the file into your DAW.
8. Put sounds on each MIDI track.

## The Controls

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

## MIDI Tracks And Channels

The generated file is split into tracks so you can assign different sounds in your DAW.

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Evolving Pads | Warm pad, soft strings, airy synth, reverb-heavy texture |
| 2 | Sub Bass | Clean sine/sub bass, simple low synth |
| 3 | Echo Plucks | Bell, mallet, glassy pluck, delay-heavy synth |
| 4 | Reese Bass | Wide bass synth, detuned saw bass, darker mid bass |
| 10 | Break Kit | Drum rack, breakbeat kit, acoustic/electronic drum kit |

Channel 10 is the standard MIDI drum channel in many DAWs and sound modules.

## How To Make It Sound More Finished

After importing the MIDI, the biggest improvement comes from choosing good sounds.

For pads, use a soft synth sound with long attack and plenty of reverb. For sub bass, use a clean low sound and keep it simple. For Reese bass, use something wider and dirtier, but keep it quieter than the sub. For drums, try a breakbeat-style kit or slice the drum MIDI into your favorite drum rack.

Add reverb and delay to the pads and plucks. Keep the sub bass mostly dry. Add compression or saturation to the drums if they feel too flat.

## Good Beginner Settings

Try these combinations:

| Goal | Mood | Scale | Breaks | Harmony | Air |
| --- | --- | --- | --- | --- | --- |
| Smooth liquid | Liquid | Dorian | 58% | 70% | 80% |
| Dark ambient | Dark | Phrygian | 55% | 60% | 85% |
| Deep roller | Deep | Natural Minor | 65% | 55% | 65% |
| Floating intro | Ethereal | Major or Dorian | 35% | 65% | 95% |

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
