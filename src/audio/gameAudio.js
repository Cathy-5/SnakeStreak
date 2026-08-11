import crashUrl from '../assets/sounds/duang.MP3'
import poisonPickupUrl from '../assets/sounds/just ate purple egg.MP3'
import poisonStateUrl from '../assets/sounds/poisoned state.MP3'
import streakUrl from '../assets/sounds/streak.MP3'
import swallowUrl from '../assets/sounds/swallow.MP3'
import winnerUrl from '../assets/sounds/winner.MP3'

const SOUND_CONFIG = {
  swallow: { source: swallowUrl, volume: 0.55, poolSize: 3 },
  poisonPickup: { source: poisonPickupUrl, volume: 0.7, poolSize: 2 },
  poisonState: { source: poisonStateUrl, volume: 0.2, poolSize: 1, loop: true },
  crash: { source: crashUrl, volume: 0.65, poolSize: 2 },
  streak: { source: streakUrl, volume: 0.75, poolSize: 2 },
  // Keep the victory cue short so it lands with the WOW screen.
  winner: { source: winnerUrl, volume: 0.85, poolSize: 1, maxDuration: 1_600 },
};

function createAudio(source, volume, loop = false) {
  const audio = new Audio(source);
  audio.preload = 'auto';
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

export function createGameAudioBank() {
  const sounds = Object.fromEntries(
    Object.entries(SOUND_CONFIG).map(([name, config]) => [
      name,
      {
        cursor: 0,
        maxDuration: config.maxDuration,
        tracks: Array.from(
          { length: config.poolSize },
          () => createAudio(config.source, config.volume, config.loop),
        ),
      },
    ]),
  );

  return { sounds, unlocked: false };
}

export function unlockGameAudio(bank) {
  if (!bank || bank.unlocked) return;
  bank.unlocked = true;

  Object.entries(bank.sounds).forEach(([name, { tracks }]) => {
    // Never start the looping poison track during mobile audio unlocking.
    if (name === 'poisonState') return;

    tracks.forEach((audio) => {
      const originalVolume = audio.volume;
      audio.volume = 0;
      const playback = audio.play();
      playback?.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = originalVolume;
      }).catch(() => {
        audio.volume = originalVolume;
        bank.unlocked = false;
      });
    });
  });
}

export function playGameSound(bank, name) {
  const sound = bank?.sounds[name];
  if (!sound) return;

  const availableTrack = sound.tracks.find((audio) => audio.paused || audio.ended);
  const audio = availableTrack ?? sound.tracks[sound.cursor];
  sound.cursor = (sound.cursor + 1) % sound.tracks.length;
  clearTimeout(audio.stopTimer);
  audio.currentTime = 0;
  audio.play()?.catch(() => {});

  if (sound.maxDuration) {
    audio.stopTimer = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.stopTimer = null;
    }, sound.maxDuration);
  }
}

export function stopGameSound(bank, name) {
  bank?.sounds[name]?.tracks.forEach((audio) => {
    clearTimeout(audio.stopTimer);
    audio.stopTimer = null;
    audio.pause();
    audio.currentTime = 0;
  });
}

export function stopAllGameSounds(bank) {
  if (!bank) return;
  Object.keys(bank.sounds).forEach((name) => stopGameSound(bank, name));
}
