# Snake Break

Snake Break is a playful twist on the classic Snake game. Collect eggs, dodge purple confusion eggs, and escape the cracked egg that comes after a growing snake.

## Screenshots

<p align="center">
  <img src="src/assets/images/Game%20presentation.png" alt="Snake Break game presentation">
</p>

## Features

- Classic grid-based Snake movement with keyboard and touch-swipe controls.
- Three difficulty modes with different movement speeds and confusion durations.
- Two-egg choice system that makes route planning more strategic.
- Purple confusion eggs that reverse the controls for a limited time.
- Difficult-mode purple surges with a visible `3, 2, 1` warning countdown.
- A cracked egg that hatches when the snake reaches six segments and chases it across the board.
- Wall impact animation, crash feedback, and a dedicated WOW victory scene.
- Egg count, snake size, and personal-record tracking.
- Responsive layout for desktop, phone, and tablet screens.
- Optional sound effects with mobile-safe audio unlocking.

## How to Play

1. Choose a difficulty mode.
2. Use the arrow keys on desktop or swipe anywhere on the board on mobile and tablet.
3. Collect eggs while avoiding the snake's body and the board boundary.
4. Avoid purple eggs unless you are ready for reversed controls.
5. When the cracked egg hatches, keep moving and stay ahead of it.

## Tech Stack

- React
- JavaScript
- Vite
- CSS
- Web Audio API
- Browser `localStorage` for personal records

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL shown by Vite in your browser.

## Available Scripts

```bash
npm run dev      # Start the development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run preview  # Preview the production build locally
```

## Project Structure

```text
src/
├── App.jsx                  # Main game state and gameplay rules
├── App.css                  # Layout, responsive styles, and animations
├── audio/                   # Sound effect setup and playback helpers
├── components/              # Board, snake, food, records, and victory UI
├── game/                    # Movement, food placement, and record utilities
└── assets/
    ├── images/              # Project screenshots
    └── sounds/              # Game sound effects
```
