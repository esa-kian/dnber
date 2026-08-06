# DnBer: Multi-Genre MIDI Generator

DnBer is an open-source web app for generating ambient drum and bass, jungle, liquid, dancefloor, jump up, neurofunk, and hypnotic techno MIDI sketches.

The generator creates separate MIDI tracks for drums, bass, atmosphere, stabs, and FX. Use the controls to shape the arrangement before importing the `.mid` file into a DAW.

## What This App Makes

DnBer does not render finished audio by itself. It creates a `.mid` file, which is a set of musical instructions: which notes to play, when they happen, how hard they hit, and which MIDI channel they belong to.

You import that MIDI file into a music app like Ableton, Logic, GarageBand, FL Studio, Bitwig, Reaper, or Cubase. Then you choose the actual sounds: drums, bass synths, pads, and effects.

Think of it as a sketch generator for electronic music ideas. It gives you the arrangement and musical movement; your DAW gives it sound design and mixing.

## Quick Start

1. Choose a main genre: **DnB** or **Hypnotic Techno**.
2. If you choose **DnB**, choose a DnB style: **Ambient DnB**, **Jungle**, **Liquid**, **Dancefloor**, **Jump Up**, or **Neurofunk**.
3. Choose a mood or style.
4. Pick a tempo and length.
5. Leave the key and scale on the defaults if you are unsure.
6. Adjust the detail controls if you want more or less movement.
7. Click **Generate Composition**.
8. Download the `.mid` file.
9. Import the file into your DAW.
10. Put sounds on each MIDI track.

## Main Genres

### DnB

DnB contains the fast breakbeat-based generators: Ambient DnB, Jungle, Liquid, Dancefloor, Jump Up, and Neurofunk.

### Hypnotic Techno

Hypnotic Techno is the 4/4 techno generator. It has its own tempo range, routing, controls, and groove logic.

## DnB Styles

### Ambient DnB

Ambient DnB creates smoother, spacious sketches with pads, sub bass, Reese bass, echo plucks, and clean breakbeat drums.

Use this when you want liquid, deep, atmospheric, or floating DnB ideas.

### Jungle

Jungle treats the break as the lead instrument. It writes chopped Amen/Think/Apache-style drum programming, dub sub bass, pads, rave stabs, sirens, phrase-end edits, and breakdowns.

Important: this is still MIDI. For the most authentic result, put a sliced break kit or sampler on the drum track instead of a plain acoustic drum kit. The MIDI gives you the chop timing and accents; your drum rack gives it the sample character.

Use this when you want classic, ragga, darkside, or atmospheric jungle sketches.

### Liquid

Liquid creates cleaner, musical DnB sketches with rolling drums, warm keys, extended chords, melodic sub movement, pads, and pluck or vocal-style hooks.

Important: Liquid depends on tasteful sound selection. Use clean drums, warm electric piano or piano, a controlled sub, and gentle reverb/delay rather than aggressive bass design.

Use this when you want smooth, soulful, deep, or vocal liquid DnB ideas.

### Dancefloor

Dancefloor creates polished, hook-led DnB sketches with big clean drums, anthem chords, bright lead hooks, lifted Reese bass, clean sub, plucks, builds, risers, and clear drop sections.

Important: Dancefloor works best when the hook is easy to understand and the mix has space. Use wide lead and chord sounds, but keep the sub clean and centered. The bass should lift the drop instead of fighting the vocal or main melody.

Use this when you want anthem, festival, vocal, or rave-style dancefloor DnB ideas.

### Jump Up

Jump Up creates energetic, bass-led DnB sketches with snappy two-step drums, clean sub weight, short wobble bass hooks, call-and-response bass phrases, rave stabs, and build-up FX.

Important: Jump Up is usually about a simple bass idea that people remember. Do not bury it under too many layers. Use short bass patches, strong kick/snare sounds, and a sub that follows the riff without getting muddy.

Use this when you want bouncy, wobble, dark, or rave-style Jump Up ideas.

### Neurofunk

Neurofunk creates tighter, more technical sketches with punchy drums, short root-centered bass phrases, pitch-bend movement, bass call-and-response, stabs, and risers.

Important: the generator writes MIDI, not the actual growling bass sound. For neurofunk, the MIDI gives you the rhythm and note movement. The final sound depends heavily on the synth patch, distortion, filtering, resampling, and mixing you use in your DAW.

Use this when you want a darker, more mechanical, bass-led DnB idea.

## Hypnotic Techno

Hypnotic Techno creates long-form 4/4 techno sketches with 909-style drums, rumble sub, low pulse, repeating sequences, sparse dub stabs, percussion, and filter FX.

Important: hypnotic techno works through restraint and slow change. Use strong drum and synth sounds, keep the low end clean, and let small filter or arrangement changes evolve over time.

Use this when you want deep, Berlin, acid, or dub-style techno ideas.

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

## Liquid Controls

### Style

Style changes the musical personality.

- **Smooth**: clean rolling drums, warm chords, and balanced hooks.
- **Soulful**: more piano-like movement and slightly richer chord choices.
- **Deep**: restrained hooks, deeper bass, and more space.
- **Vocal**: hook phrases shaped like vocal chops or lead responses.

If you are unsure, start with **Smooth**.

### Tempo

Liquid usually works well around **168-178 BPM**. The default is **174 BPM**.

### Groove

Groove controls the drum feel.

Lower values keep the beat simple and straight. Higher values add more ghost snares, swing, hats, and phrase-end touches.

### Bass Flow

Bass Flow controls the movement of the sub bass.

Lower values stay close to the root note. Higher values add more passing notes and rolling low-end movement.

### Melody

Melody controls keys, plucks, and hook activity.

Lower values keep the track chord-led. Higher values add more lead notes, call-and-response hooks, and melodic sparkle.

### Space

Space controls pads, echoes, and reverb-friendly details.

Raise it for wider, smoother liquid. Lower it for a tighter roller.

## Dancefloor Controls

### Style

Style changes the hook and drop personality.

- **Anthem**: big melodic hooks, clean chords, and a balanced drop.
- **Festival**: brighter, more energetic phrases with stronger chord stabs.
- **Vocal**: smoother call-and-response hooks that leave room for a vocal.
- **Rave**: brighter lead movement, more plucks, and extra lift.

If you are unsure, start with **Anthem**.

### Tempo

Dancefloor DnB usually works well around **168-178 BPM**. The default is **174 BPM**.

### Scale Type

Dancefloor can be dark, emotional, or uplifting.

- **Natural Minor**: emotional and powerful, a strong default.
- **Dorian**: smoother and a little less sad.
- **Major**: brighter and more euphoric.

### Drums

Drums controls how punchy and busy the beat is.

Lower values keep the drums cleaner and more spacious. Higher values add stronger kick/snare weight, more hats, and phrase-end fills.

### Bass Lift

Bass Lift controls the low-end energy and filter movement.

Lower values keep the bass more restrained. Higher values make the Reese/saw bass move more and support a bigger drop.

### Hook

Hook controls lead melody, plucks, and chord emphasis.

Lower values keep the sketch more instrumental and spacious. Higher values make the main lead more obvious and memorable.

### Builds

Builds controls risers, snare rolls, crashes, and pre-drop energy.

Raise it for a bigger festival-style build. Lower it when you want a cleaner arrangement with less drama.

## Jump Up Controls

### Style

Style changes the bass hook and support parts.

- **Bouncy**: simple, catchy root/fifth-style wobble riffs.
- **Wobble**: longer bass notes with more filter and pitch movement.
- **Dark**: heavier, sparser riffs with tense notes.
- **Rave**: more stabs, octave pops, and bright hook energy.

If you are unsure, start with **Bouncy**.

### Tempo

Jump Up usually works well around **170-178 BPM**. The default is **174 BPM**.

### Scale Type

Jump Up usually works best when the bass riff has a dark center.

- **Natural Minor**: the best all-round default.
- **Phrygian**: darker and more tense.
- **Dorian**: a little smoother and less harsh.

### Drums

Drums controls how tight and forceful the kick, snare, hats, and fills are.

Lower values keep the beat lighter. Higher values make the drums snap harder and add more phrase-end fills.

### Wobble

Wobble controls bass movement.

Lower values make the bass more static. Higher values add more pitch bends, filter movement, and talking-bass motion.

### Bass Riff

Bass Riff controls how active the hook is.

Lower values leave more space between bass hits. Higher values play more of the full two-bar riff and make the drop more energetic.

### Hype

Hype controls stabs, build-ups, fills, and FX.

Raise it for a more ravey, high-energy sketch. Lower it when you want the bass and drums to stay cleaner.

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

## Hypnotic Techno Controls

### Style

Style changes the kind of techno groove the generator writes.

- **Deep**: restrained drums, smoother sequences, and more space.
- **Berlin**: driving, functional, peak-time hypnotic techno.
- **Acid**: more active note movement for a 303-style synth line.
- **Dub**: slower chord hits, more atmosphere, and reverb-friendly stabs.

If you are unsure, start with **Berlin**.

### Tempo

Hypnotic techno usually works well around **124-140 BPM**. The default is **132 BPM**.

Lower values feel deeper and heavier. Higher values feel more driving and club-focused.

### Scale Type

Hypnotic techno often works best with a dark, narrow note palette.

- **Phrygian**: tense, tunneling, and darker.
- **Natural Minor**: dark but familiar.
- **Dorian**: smoother and more open.

If you are unsure, use **Phrygian** for Berlin or Acid, and **Dorian** for Deep.

### Drive

Drive controls how hard the groove pushes.

Higher values increase kick weight, rumble intensity, and filter bite. Lower values leave more space.

### Hypnosis

Hypnosis controls how locked and active the repeating sequence feels.

Higher values create more repeated motion and subtle mutations. Lower values keep the sequence sparse.

### Percussion

Percussion controls hats, shakers, ghost hits, and tom movement.

Lower values make the groove stripped and steady. Higher values add more shuffle and phrase-end motion.

### Space

Space controls dub stabs, reverb-friendly events, and filter FX.

Raise it for deeper atmosphere. Lower it when you want the kick, rumble, and sequence to dominate.

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

## Liquid MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Keys and Chords | Electric piano, warm piano, soft synth keys |
| 2 | Liquid Sub | Clean sub bass, rounded synth bass |
| 3 | Warm Pads | Soft pad, strings, airy background layer |
| 4 | Hooks and Plucks | Pluck, bell, vocal chop, soft lead |
| 10 | Clean Rolling Drums | Tight DnB kit, clean break kit, light percussion |

## Dancefloor MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Lead Hook | Supersaw lead, vocal-style lead, bright synth hook |
| 2 | Clean Sub Bass | Clean sine/sub bass, centered low synth |
| 3 | Anthem Chords | Supersaw chords, warm pad, bright chord stack |
| 4 | Lifted Reese Bass | Reese bass, saw bass, wide mid bass |
| 5 | Plucks and Arps | Pluck, bell, arpeggio synth, short bright layer |
| 7 | Builds and FX | Riser, sweep, impact, uplifter, downlifter |
| 10 | Polished Dancefloor Drums | Punchy DnB kit, clean layered kick/snare, crisp hats |

## Jump Up MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Hooks and Rave Stabs | Short lead, rave stab, brass hit, organ stab |
| 2 | Sub Punch | Clean sine/sub bass, rounded low synth |
| 5 | Wobble Bass Main | Short wobble bass, square/saw bass, FM bass |
| 6 | Bass Answer | Second short bass patch for response phrases |
| 7 | FX and Hype | Noise riser, impact, sweep, tonal FX |
| 10 | Snappy Jump Up Drums | Punchy DnB kit, tight kick/snare, crisp hats |

## Neurofunk MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Stabs | Short brass stab, distorted synth hit, metallic chord |
| 2 | Sub Weight | Clean sine/sub bass under the main bass phrase |
| 5 | Bass Main | Main growl, FM bass, wavetable bass, distorted saw bass |
| 6 | Bass Response | Second bass patch for call-and-response movement |
| 7 | FX Risers | Noise riser, tonal FX, glassy sweep, impact layer |
| 10 | Tight Drums | Punchy DnB kit, layered kick/snare, tight hats |

## Hypnotic Techno MIDI Routing

| MIDI Channel | Track | Suggested Sound |
| --- | --- | --- |
| 1 | Dub Stabs | Short dub chord, organ stab, filtered pad, chord synth |
| 2 | Rumble Sub | Low sine, resampled rumble, muted bass synth |
| 3 | Low Pulse | Analog bass, muted pluck, low mono synth |
| 4 | Hypnotic Sequence | Mono synth, FM pluck, 303-style synth |
| 5 | Shakers and Percussion | Shaker, rim, noise hat, modular percussion |
| 6 | Filter FX | Noise sweep, airy synth, filtered texture |
| 10 | 909 Kick and Hats | 909 kit, drum rack, hardware drum machine |

## How To Make It Sound More Finished

After importing the MIDI, the biggest improvement comes from choosing good sounds.

For ambient pads, use a soft synth sound with long attack and plenty of reverb. For sub bass, use a clean low sound and keep it simple. For Reese bass, use something wider and dirtier, but keep it quieter than the sub. For drums, try a breakbeat-style kit or slice the drum MIDI into your favorite drum rack.

For jungle drums, use a breakbeat sampler or drum rack with kick, snare, hats, toms, and ghost snare layers. The Chopped Breaks track is written like a sliced break, so it will sound most convincing when the drum sounds are short, gritty, and sample-like. Keep the Dub Sub track clean and heavy.

For liquid, use cleaner drum sounds than jungle or neurofunk. Put an electric piano or warm piano on Keys and Chords, a clean sub on Liquid Sub, a soft pad on Warm Pads, and a gentle pluck or vocal chop on Hooks and Plucks. Reverb and delay should be present, but not so heavy that the groove disappears.

For dancefloor, use polished and wide sounds. Put a supersaw or vocal-style synth on Lead Hook, wide chords on Anthem Chords, a clean centered bass on Clean Sub Bass, and a Reese or saw bass on Lifted Reese Bass. Sidechain the chords and bass to the kick in your DAW so the drop breathes.

For jump up, keep the bass sounds short and obvious. Put a clean sub on Sub Punch, a memorable wobble patch on Wobble Bass Main, and a different bass patch on Bass Answer. The MIDI includes pitch bend, mod wheel, and filter cutoff cues, but the final character comes from your synth patch. Keep the drums punchy and less messy than jungle.

For neurofunk bass, use a synth patch with movement: wavetable, FM, formant, comb filtering, distortion, or automated filter cutoff. Put different sounds on Bass Main and Bass Response so the phrase talks back and forth. The MIDI includes pitch bend, mod wheel, filter cutoff, and resonance automation cues. Keep the Sub Weight track clean and centered underneath them.

For hypnotic techno, start with a strong 909 kit and a clean low-end setup. Put a short kick on 909 Kick and Hats, then shape Rumble Sub with sidechain compression so it blooms after the kick. Use a mono synth for Hypnotic Sequence and automate cutoff or resonance slowly. Keep Dub Stabs filtered and delayed, but remove low frequencies from the reverb.

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
| Smooth liquid | Liquid | Smooth | Dorian | Groove 72%, Bass Flow 74%, Melody 68%, Space 72% |
| Soulful liquid | Liquid | Soulful | Major or Dorian | Groove 68%, Bass Flow 70%, Melody 78%, Space 70% |
| Deep liquid | Liquid | Deep | Natural Minor | Groove 62%, Bass Flow 76%, Melody 45%, Space 82% |
| Anthem dancefloor | Dancefloor | Anthem | Natural Minor | Drums 82%, Bass Lift 76%, Hook 84%, Builds 78% |
| Vocal dancefloor | Dancefloor | Vocal | Dorian | Drums 72%, Bass Lift 62%, Hook 78%, Builds 66% |
| Festival dancefloor | Dancefloor | Festival | Major or Minor | Drums 88%, Bass Lift 82%, Hook 90%, Builds 86% |
| Bouncy jump up | Jump Up | Bouncy | Natural Minor | Drums 84%, Wobble 78%, Bass Riff 86%, Hype 70% |
| Dark jump up | Jump Up | Dark | Phrygian | Drums 78%, Wobble 72%, Bass Riff 74%, Hype 58% |
| Rave jump up | Jump Up | Rave | Natural Minor | Drums 88%, Wobble 76%, Bass Riff 88%, Hype 86% |
| Hard techstep neuro | Neurofunk | Techstep | Phrygian | Drums 82%, Bass Motion 88%, Tech 78%, Tension 82% |
| Sparse dark neuro | Neurofunk | Dark | Natural Minor | Drums 62%, Bass Motion 58%, Tech 45%, Tension 82% |
| Clean neuro roller | Neurofunk | Rolling | Phrygian | Drums 74%, Bass Motion 78%, Tech 62%, Tension 74% |
| Berlin techno tunnel | Hypnotic Techno | Berlin | Phrygian | Drive 78%, Hypnosis 86%, Percussion 64%, Space 72% |
| Deep techno warehouse | Hypnotic Techno | Deep | Dorian | Drive 62%, Hypnosis 88%, Percussion 48%, Space 82% |
| Acid techno lock | Hypnotic Techno | Acid | Phrygian | Drive 74%, Hypnosis 80%, Percussion 66%, Space 58% |
| Dub techno chamber | Hypnotic Techno | Dub | Natural Minor | Drive 58%, Hypnosis 72%, Percussion 44%, Space 88% |

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
