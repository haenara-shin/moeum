export type OcrBlock = {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
};

export type OcrResult = {
  rawText: string;
  blocks: OcrBlock[];
};

export type MoeumOcrModuleType = {
  readonly supportedLanguages: string[];
  readonly platform: 'ios' | 'android';
  recognizeText(uri: string): Promise<OcrResult>;
};
