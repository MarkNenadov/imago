import { v4 as uuid } from "uuid";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export function generateImagePath(extension: string): string {
  return `/uploads/${uuid()}.${extension}`;
}

export function isAllowedExtension(extension: string): boolean {
  return ALLOWED_EXTENSIONS.has(extension.toLowerCase());
}
