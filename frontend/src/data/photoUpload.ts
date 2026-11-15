export type PreparePhoto = (photo: File) => Promise<File>;

let preparePhoto: PreparePhoto = async (photo) => photo;

export function configurePhotoUpload(prepare: PreparePhoto): void {
  preparePhoto = prepare;
}

export function preparePhotoForUpload(photo: File): Promise<File> {
  return preparePhoto(photo);
}
