export interface HomeCourse {
  id: string;
  name: string | null;
}

export interface Settings {
  friendCode: string | null;
  handicap: number | null;
  homeCourse: HomeCourse | null;
}

export interface DevicePreferences {
  getUpdates: boolean;
}

export interface SettingsForm extends DevicePreferences {
  handicapInput: string;
  homeCourse: HomeCourse | null;
}

export function formChanged(form: SettingsForm, saved: SettingsForm): boolean {
  return (
    form.handicapInput !== saved.handicapInput
    || (form.homeCourse?.id ?? null) !== (saved.homeCourse?.id ?? null)
    || form.getUpdates !== saved.getUpdates
  );
}
