import ExpoModulesCore
import Vision
import UIKit

// MARK: - Module
public class MoeumOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoeumOcrModule")

    Constants([
      "supportedLanguages": ["ko-KR", "en-US"],
      "platform": "ios"
    ])

    AsyncFunction("recognizeText") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("E_INVALID_URI", "Invalid image URI: \(uri)")
        return
      }

      Self.loadImage(from: url) { result in
        switch result {
        case .failure(let err):
          promise.reject("E_IMAGE_LOAD", err.localizedDescription)
        case .success(let cgImage):
          Self.recognize(cgImage: cgImage) { ocrResult in
            switch ocrResult {
            case .failure(let err):
              promise.reject("E_OCR", err.localizedDescription)
            case .success(let payload):
              promise.resolve(payload)
            }
          }
        }
      }
    }
  }

  // MARK: - Image loading
  private static func loadImage(from url: URL, completion: @escaping (Result<CGImage, Error>) -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let data: Data
        if url.isFileURL {
          data = try Data(contentsOf: url)
        } else if url.scheme == "data" {
          // data: URI fallback (rare path from expo-image-picker)
          if let base64 = url.absoluteString.components(separatedBy: ",").last,
             let decoded = Data(base64Encoded: base64) {
            data = decoded
          } else {
            throw NSError(domain: "MoeumOcr", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cannot decode data URI"])
          }
        } else {
          data = try Data(contentsOf: url)
        }

        guard let uiImage = UIImage(data: data), let cgImage = uiImage.cgImage else {
          throw NSError(domain: "MoeumOcr", code: -2, userInfo: [NSLocalizedDescriptionKey: "Cannot decode image"])
        }

        completion(.success(cgImage))
      } catch {
        completion(.failure(error))
      }
    }
  }

  // MARK: - Vision OCR
  private static func recognize(cgImage: CGImage, completion: @escaping (Result<[String: Any], Error>) -> Void) {
    let request = VNRecognizeTextRequest { (request, error) in
      if let error = error {
        completion(.failure(error))
        return
      }

      guard let observations = request.results as? [VNRecognizedTextObservation] else {
        completion(.success(["rawText": "", "blocks": []]))
        return
      }

      var blocks: [[String: Any]] = []
      var lines: [String] = []

      for obs in observations {
        guard let top = obs.topCandidates(1).first else { continue }
        let bbox = obs.boundingBox
        let block: [String: Any] = [
          "text": top.string,
          "confidence": top.confidence,
          "bbox": [
            "x": bbox.origin.x,
            "y": bbox.origin.y,
            "width": bbox.size.width,
            "height": bbox.size.height
          ]
        ]
        blocks.append(block)
        lines.append(top.string)
      }

      let payload: [String: Any] = [
        "rawText": lines.joined(separator: "\n"),
        "blocks": blocks
      ]
      completion(.success(payload))
    }

    request.recognitionLanguages = ["ko-KR", "en-US"]
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = false

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        completion(.failure(error))
      }
    }
  }
}
