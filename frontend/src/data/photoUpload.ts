/** Readies a picked photo for upload — on the web, shrinking it on a canvas. */
export type PreparePhoto = (photo: File) => Promise<File>;

let preparePhoto: PreparePhoto = async (photo) => photo;

/** The app edge installs the platform's preparation; until then a photo goes up as picked. */
export function configurePhotoUpload(prepare: PreparePhoto): void {
  preparePhoto = prepare;
}

export function preparePhotoForUpload(photo: File): Promise<File> {
  return preparePhoto(photo);
}
