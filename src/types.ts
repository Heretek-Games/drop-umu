export interface UmuStatus {
  installed: boolean;
  version?: string;
  path?: string;
  isBundledVersion: boolean;
  bundledVersion: string;
  pythonAvailable: boolean;
  pythonVersion?: string;
  steamRuntimeInstalled?: boolean;
}

export interface UmuReleaseInfo {
  version: string;
  downloadUrl: string;
  sha256: string;
  publishedAt: string;
}

export interface InstallOptions {
  targetPath?: string;
  force?: boolean;
}

export interface InstallResult {
  success: boolean;
  path: string;
  version: string;
  error?: string;
}
