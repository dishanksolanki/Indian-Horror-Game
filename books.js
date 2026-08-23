// books.js — shared helper for the four collectible storybooks scattered
// through the haveli (rooms 8, 9, 13, 22).
//
// Books work EXACTLY like the hammer (engine.pickupItem / heldItem):
// walk up, press [E], the book pops into your hands as a viewmodel parented
// to the camera. You can carry it around, [G] drop it back into the world,
// or walk it over to the book holder in room25 and [E] the holder to place
// it — which is where it actually "does its work" (see room25.js: placing
// consumes the held book and sets engine.inventory.bookN = true).
//
// Only one item can be held at a time (engine.heldItem is a single slot,
// not a bag), so the player will naturally end up ferrying the four books
// one at a time — pick up, walk to room25, place, walk back for the next.

import * as THREE from "three";

const COVER_COLORS = {
  book1: 0x7a1f1f, // deep red
  book2: 0x1f3d7a, // deep blue
  book3: 0x1f5a2e, // deep green
  book4: 0x5a3d1f, // brown/leather
};

// Tracks which bookIds already have a live pickup interactable registered,
// so calling addBookPickup twice for the same id (e.g. a room module
// accidentally re-run, or hot-reload re-invoking room setup) can't silently
// spawn two overlapping interactables for the same book — which would make
// pickup look "broken" (you'd interact with one, but a duplicate world book
// mesh /interactable would still be sitting there, or the wrong one would
// win the raycast focus check).
const _registeredBookIds = new Set();

/**
 * Adds a single collectible/carryable book to a room.
 * @param {THREE.Scene} scene
 * @param {Engine} engine
 * @param {{x:number,y:number,z:number}} position - world position to rest the book at (e.g. on the floor)
 * @param {string} bookId - unique id, one of "book1".."book4" — also used as the
 *   engine.inventory flag name once the book is PLACED on the holder (not on pickup)
 * @param {string} label - display name shown in "Pick Up X" / held-item prompts
 * @returns {{mesh: THREE.Group}|null} null if this bookId was already registered elsewhere
 */
export function addBookPickup(scene, engine, position, bookId, label) {
  if (!engine.inventory) engine.inventory = {};

  if (_registeredBookIds.has(bookId)) {
    console.warn(
      `[books.js] addBookPickup() called again for "${bookId}" — a pickup for this ` +
      `id is already registered elsewhere. Skipping to avoid a duplicate interactable ` +
      `(this is almost always caused by a room's setup function running twice — ` +
      `check main.js isn't calling createRoomX() more than once).`
    );
    return null;
  }

  const coverColor = COVER_COLORS[bookId] ?? 0x3a2a1a;
  const coverMat = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.6 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });

  const book = new THREE.Group();
  book.position.set(position.x, position.y, position.z);
  book.rotation.y = Math.random() * Math.PI * 2;

  // pages, sandwiched between two covers
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.22), pageMat);
  pages.position.y = 0.015;
  book.add(pages);

  const coverGeo = new THREE.BoxGeometry(0.18, 0.012, 0.24);
  const bottomCover = new THREE.Mesh(coverGeo, coverMat);
  bottomCover.position.y = -0.001;
  book.add(bottomCover);

  const topCover = new THREE.Mesh(coverGeo, coverMat);
  topCover.position.y = 0.031;
  book.add(topCover);

  book.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  scene.add(book);

  // Radius bumped from 1.6 -> 1.9. Books sit low (y ~0.05) and are small, so
  // the horizontal-facing-dot check in engine.js's _updateInteractionFocus
  // already requires a fairly direct look at them; a slightly bigger catch
  // radius makes them easier to actually trigger without changing anything
  // about how the hammer or other props behave.
  const PICKUP_RADIUS = 1.9;

  const interactable = engine.addInteractable(book, {
    radius: PICKUP_RADIUS,
    prompt: `Pick Up ${label}`,
    onInteract: () => {
      console.log(`[books.js] "${label}" (${bookId}) interacted with — attempting pickup. Currently held:`, engine.heldItem);

      const picked = engine.pickupItem({
        id: bookId,
        mesh: book,
        prompt: label,
        holdOffset: new THREE.Vector3(0.28, -0.22, -0.55),
        throwable: false, // books aren't noise-distraction items
        onPickup: () => {
          engine.removeInteractable(interactable);
          _registeredBookIds.delete(bookId); // free the id in case it's ever dropped and re-picked up via a different path
          console.log(`[books.js] picked up ${bookId} ("${label}") — now held. engine.heldItem:`, engine.heldItem);
        },
      });

      if (!picked) {
        console.log(
          `[books.js] couldn't pick up ${bookId} — already holding "${engine.heldItem?.id}". ` +
          `Drop it with [G] first, or carry it to the room25 holder and place it.`
        );
      }
    },
  });

  _registeredBookIds.add(bookId);

  return { mesh: book };
}
