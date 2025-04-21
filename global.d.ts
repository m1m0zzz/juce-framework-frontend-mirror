/*
This projects that don't include the DOM library need these interfaces to compile.

Warning: all of these interfaces are empty. If you want type definitions for various properties
(such as HTMLInputElement.prototype.value), you need to add `--lib DOM` (via command line or tsconfig.json).
*/

interface Event {};
interface MouseEvent extends Event {};

interface Element {};

// ============================================================================

declare class Backend {
  /** @type {EventListenerList} */
  listeners: EventListenerList;
  /**
   * @param {string} eventId
   * @param {(args: any) => any} fn
   * @returns {[string, number]}
   */
  addEventListener(eventId: string, fn: (args: any) => any): [string, number];
  /**
   * @param {[eventId: string, id: number]} param0
   */
  removeEventListener([eventId, id]: [string, number]): void;
  /**
   * @param {string} eventId
   * @param {any} object
   */
  emitEvent(eventId: string, object: any): void;
  /**
   * @param {string} eventId
   * @param {any} object
   */
  emitByBackend(eventId: string, object: any): void;
}

declare global {
  var __JUCE__: {
    backend: Backend
    initialisationData: {[key: string]: any}
    // Note: Hidden for internal implementation.
    // | {
    //   __juce__platform: string[],
    //   __juce__functions: string[],
    //   __juce__registeredGlobalEventIds: any[],
    //   __juce__sliders: string[],
    //   __juce__toggles: string[],
    //   __juce__comboBoxes: string[],
    // }
    postMessage: () => void
  }
}

export {};
