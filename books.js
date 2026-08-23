// books.js — shared helper for the four collectible storybooks scattered
// through the haveli (rooms 8, 9, 13, 22). Each book is a simple pickup:
// walk up, press [E], it disappears from the world and sets a boolean flag
// on engine.inventory (e.g. engine.inventory.book1 = true).
//
// Unlike the hammer, books are NOT carried as a held-item viewmodel —
// engine.heldItem only ever holds one thing at a time, but the player needs
// to gather all four books independently of whatever else they're carrying,
// so they're tracked as simple inventory flags instead (same pattern as
// engine.inventory.hammer in room17/room25).
//
// All four books get racked on the book holder fixture in room25 (see
// room25.js) — that's the actual gate on the north door / win condition,
// alongside the existing hammer+plank puzzle.

import * as THREE from "three";

const COVER_COLORS = {
  book1: 0x7a1f1f, // deep red
  book2: 0x1f3d7a, // deep blue
  book3: 0x1f5a2e, // deep green
  book4: 0x5a3d1f, // brown/leather
};

/**
 * Adds a single collectible book to a room.
 * @param {THREE.Scene} scene
 * @param {Engine} engine
 * @param {{x:number,y:number,z:number}} position - world position to rest the book at (e.g. on the floor)
 * @param {string} bookId - unique id, one of "book1".."book4" — used as the engine.inventory flag name
 * @param {string} label - display name shown in the pickup prompt, e.g. "Old Diary"
 * @returns {{mesh: THREE.Group, interactable: object}}
 */
export function addBookPickup(scene, engine, position, bookId, label) {
  if (!engine.inventory) engine.inventory = {};

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

  let collected = false;
  const interactable = engine.addInteractable(book, {
    radius: 1.6,
    prompt: `Pick Up ${label}`,
    onInteract: () => {
      if (collected) return;
      collected = true;
      engine.inventory[bookId] = true;
      console.log(`[books.js] ${bookId} ("${label}") collected — engine.inventory.${bookId} is now true`);
      engine.removeInteractable(interactable);
      scene.remove(book);
      // optional hook a room can set (room25 doesn't currently need this,
      // since its holder prompt re-checks engine.inventory live each time
      // it's focused, but it's here in case some future room wants to react
      // the instant any book is picked up anywhere in the house).
      if (typeof engine._onBookCollected === "function") engine._onBookCollected(bookId);
    },
  });

  return { mesh: book, interactable };
}
