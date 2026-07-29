# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies (a `bun.lockb` exists, so `bun install` also works)
- `npm run dev` — start the Vite dev server (`--host`, exposed on the network)
- `npm run build` — production build
- `npm run lint` — ESLint over the repo
- `npm run preview` — preview the production build

There is no test framework in this project.

## Git workflow

- When adding a feature, create a feature branch off `main` and work there — do not commit features directly to `main`.
- Do not add a "Co-Authored-By: Claude" line (or any co-author trailer) to commit messages.
- Never merge a feature branch into `main` without the user's explicit approval. In particular, `feature/sound` (game audio) is on hold until the user approves the merge.

Append `?debug` to the dev URL to enable collision debugging (red wireframe wall collider, green BVH helper, cyan player capsule).

## What this is

A browser Mario Kart clone built with React Three Fiber (React 19 + Vite + three.js). Plain JavaScript/JSX (no tsconfig; the vendored `src/wawa-vfx` is TS and compiles through Vite). `.glsl` files are imported directly via `vite-plugin-glsl`. PWA is configured in `vite.config.js`.

## Architecture

Render tree: `main.jsx` → `WebGPUCanvas.jsx` (a regular WebGL `<Canvas>` despite the name) → `App.jsx` (scene root: global VFX particle pools, `KeyboardControls`, `TrackScene`, `Lighting`, `Composer`, hidden Leva panel) → `TrackScene.jsx` (`PlayerController` + `Track`).

### Physics is custom, not a physics engine

`@react-three/rapier` is in package.json but is **not used** at runtime. All kart movement is hand-rolled kinematics in `PlayerController.jsx`'s `useFrame` loop: speed, steering, drift, jump, and boost live in refs and are eased with `damp` from three's MathUtils. The player is a plain `group` whose position/rotation are set directly each frame; the camera lerps toward a child camera-rig group.

Two separate collision/ground systems, both BVH-accelerated via `three-mesh-bvh` (imported in source but **not a direct dependency** — it resolves transitively through drei; keep that in mind if upgrading deps):

1. **Wall collision** (`src/utils/KartCollision.js` + setup in `PlayerController.jsx`): at startup the scene is traversed and every mesh whose name contains `wall`, `barrier`, `fence`, `border`, or `collision` is merged into a single invisible BVH collider. Each frame, capsule-vs-BVH `shapecast` adjusts the desired position; a hit sets a bounce-back speed and a 1.5 s stun timer.
2. **Ground detection** (`src/models/Wheels.jsx`, `src/models/Kart.jsx`): downward `Raycaster` with `firstHitOnly` and `raycaster.layers.set(1)`. Track meshes are placed on **layer 1** and the main camera enables layer 1 in `App.jsx`.

**Mesh naming is load-bearing.** Track components (gltfjsx-generated, e.g. `src/models/Mario-circuit-test.jsx`) name meshes `ground`, `ground dirt`, `ground speed`, `wall barrier`, etc. Those names drive collider inclusion and surface behavior. When adding a track, keep the layer-1 assignment and this naming convention.

### State: three zustand stores

- `src/store.js` (`useGameStore`) — the main cross-component bus: speed, boost, drift level, player position, joystick/gamepad input, shared textures, collider and track scene refs. Components inside `useFrame` read it imperatively via `useGameStore.getState()` to avoid re-renders; per-frame values shared between components (speed, drift direction, wheel offsets) are also passed around as **refs in props**, not state.
- `src/playroomStore.js` — list of remote multiplayer players.
- `src/wawa-vfx/VFXStore.ts` (`useVFX`) — registry of named particle emitters.

### Multiplayer (Playroom)

`PlayroomStarter.jsx` calls `insertCoin()` (playroomkit) and tracks joins/quits. The local kart publishes its position every frame via `me().setState("position", ...)` in `PlayerController`. Remote players are rendered as instances of an `InstancedMesh2` (`@three.ez/instanced-mesh`) that read each player's replicated state — currently placeholder green boxes.

### VFX (vendored wawa-vfx)

`src/wawa-vfx/` is a vendored particle library. `<VFXParticles name="...">` declares a named GPU particle pool (declared once, globally, in `App.jsx`: `confettis`, `smoke`, `dust`); `<VFXEmitter emitter="...">` spawns particles into a pool by name from anywhere in the tree. Custom drift/spark/flame effects with their own GLSL live under `src/particles/`.

### Player visuals

The active character model is `src/models/Witch.jsx` (GLTF + animation actions: `IDLE-KART`, `TURN-LEFT`, `TURN-RIGHT`, `wind`); the older `src/models/Kart.jsx` is kept but commented out in `PlayerController`. Model components are gltfjsx-generated; binary assets live in `public/models/`.

### Input

Three input paths, all merged in `PlayerController`'s frame loop: keyboard (drei `KeyboardControls`, map defined in `App.jsx`), gamepad (polled via `navigator.getGamepads()` each frame), and touch (`src/mobile/` — DOM joystick/buttons rendered outside the Canvas that write into `useGameStore`; touch devices auto-accelerate). `src/mobile/react-joystick-component/` is vendored third-party code — don't lint-fix or refactor it.

Controls: W/↑ accelerate, S/↓ reverse, A/D or ←/→ steer, Space hold to jump/drift (release for mini-turbo).

### Post-processing

`Composer.jsx`: custom `ColorGrading` effect (`ColorGradingEffect.jsx`) + Bloom, with tone mapping disabled on the Canvas (`NoToneMapping`, `dpr={1}`, depth/antialias/stencil off — deliberate performance choices).
