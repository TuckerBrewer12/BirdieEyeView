/** The course the player calls home. The name is null when that course could not be read. */
export interface HomeCourse {
  id: string;
  name: string | null;
}

/** What the server keeps for the player that Settings shows and edits. */
export interface Settings {
  /** Null until the server has given the player one. */
  friendCode: string | null;
  /** The index the player set by hand, as stored (negative for a plus handicap). */
  handicap: number | null;
  homeCourse: HomeCourse | null;
}

/** Choices kept on this device, not on the account. */
export interface DevicePreferences {
  getUpdates: boolean;
}

/** The Settings form as the player has it now. */
export interface SettingsForm extends DevicePreferences {
  /** The handicap as typed, which may not parse yet. */
  handicapInput: string;
  homeCourse: HomeCourse | null;
}

/** Whether the form differs from what is saved. */
export function formChanged(form: SettingsForm, saved: SettingsForm): boolean {
  return (
    form.handicapInput !== saved.handicapInput
    || (form.homeCourse?.id ?? null) !== (saved.homeCourse?.id ?? null)
    || form.getUpdates !== saved.getUpdates
  );
}
