function matkoAssetUrl(courseId: string, filename: string): string {
  return `matko-asset://${courseId}/${encodeURIComponent(filename)}`;
}

export { matkoAssetUrl };
