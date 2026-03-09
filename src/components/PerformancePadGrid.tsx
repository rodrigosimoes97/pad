import { SHARP_NOTES, getDisplayNote, type DisplayMode, type SharpNote } from '../utils/notes';
import { PadButton } from './PadButton';

type PerformancePadGridProps = {
  currentNote: SharpNote;
  displayMode: DisplayMode;
  onSelect: (note: SharpNote) => void;
};

export const PerformancePadGrid = ({ currentNote, displayMode, onSelect }: PerformancePadGridProps) => (
  <section className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
    {SHARP_NOTES.map((note) => (
      <PadButton
        key={note}
        note={getDisplayNote(note, displayMode)}
        active={note === currentNote}
        onClick={() => onSelect(note)}
      />
    ))}
  </section>
);
