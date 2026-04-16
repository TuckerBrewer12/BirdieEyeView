import SwiftUI

struct ScanView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Scan")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Your backend scan APIs are already live. This tab is scaffolded and ready for camera/photo upload wiring next.")
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 10) {
                    Label("Capture a scorecard photo", systemImage: "camera")
                    Label("Run OCR + extraction", systemImage: "doc.text.viewfinder")
                    Label("Review and save round", systemImage: "checkmark.circle")
                }
                .font(.headline)
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                Text("Tip: we can add the full camera and upload pipeline in the next pass using `PhotosPicker` + multipart upload to `/api/scan/ocr` and `/api/scan/extract`.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .navigationTitle("Scan")
    }
}
