// StudentLayout owns the one student profile prompt. Pages ask it to open, and hear back
// when the profile was saved, through these small module-level events.
type Listener = () => void;

const openListeners = new Set<Listener>();
const savedListeners = new Set<Listener>();

/**
 * Asks StudentLayout to open the student profile prompt.
 */
export function openStudentProfilePrompt() {
    openListeners.forEach((listener) => listener());
}

/**
 * Runs `listener` whenever a page asks for the prompt. Returns the unsubscribe function.
 */
export function onStudentProfilePromptOpen(listener: Listener): () => void {
    openListeners.add(listener);

    return function() {
        openListeners.delete(listener);
    };
}

/**
 * Tells listening pages that the student profile was saved.
 */
export function notifyStudentProfileSaved() {
    savedListeners.forEach((listener) => listener());
}

/**
 * Runs `listener` after the student profile was saved. Returns the unsubscribe function.
 */
export function onStudentProfileSaved(listener: Listener): () => void {
    savedListeners.add(listener);

    return function() {
        savedListeners.delete(listener);
    };
}