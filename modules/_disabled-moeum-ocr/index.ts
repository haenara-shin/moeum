import { requireNativeModule } from 'expo';
import type { MoeumOcrModuleType, OcrResult, OcrBlock } from './src/MoeumOcr.types';

const Native: MoeumOcrModuleType = requireNativeModule('MoeumOcrModule');

export const supportedLanguages = Native.supportedLanguages;
export const platform = Native.platform;

export async function recognizeText(uri: string): Promise<OcrResult> {
  return Native.recognizeText(uri);
}

export type { OcrResult, OcrBlock };
